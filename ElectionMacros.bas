Option Explicit

'==========================================================
'  ELECTION SIMULATOR  -  MACROS  (6 parties, per-seat, turnout)
'  Parties: Conservatives, Social-Democrats, Liberals,
'           Nationalist, Independent, BP First.
'  Seat efficiency (Simulator D5:D10) scales each party's
'  per-seat probability before allocation (FPTP distortion).
'  Assign RunElection   to a button on the Simulator sheet.
'  Assign RunMonteCarlo to a button on the Monte Carlo sheet.
'==========================================================

Sub RunElection()
    Application.Calculation = xlCalculationAutomatic
    Application.Calculate
    With Sheets("Simulator")
        Dim msg As String, p As Long
        msg = "Seats won:" & vbCrLf
        For p = 1 To 6
            msg = msg & .Cells(4 + p, 3).Value & ":  " & .Cells(15 + p, 3).Value & vbCrLf
        Next p
        msg = msg & vbCrLf & "Largest party:  " & .Range("C23").Value & vbCrLf & _
              "Result:  " & .Range("C24").Value & "   (302 to win)"
        MsgBox msg, vbInformation, "Election Result"
    End With
End Sub

Sub RunMonteCarlo()
    Dim ws As Worksheet, mc As Worksheet
    Set ws = Sheets("Simulator")
    Set mc = Sheets("Monte Carlo")

    Const nStates As Long = 36
    Const nP As Long = 6

    Dim nSims As Long
    nSims = mc.Range("C4").Value
    If nSims < 1 Then nSims = 1
    If nSims > 1000000 Then nSims = 1000000

    ' seats and cumulative thresholds cum(state, 1..nP-1); cum(.,nP) = 1
    Dim seats() As Long, cum() As Double
    ReDim seats(1 To nStates): ReDim cum(1 To nStates, 1 To nP)
    Dim i As Long, p As Long, e(1 To 6) As Double, tot As Double, run As Double
    For i = 1 To nStates
        seats(i) = ws.Cells(4 + i, 9).Value          ' I  Seats
        tot = 0
        For p = 1 To nP
            e(p) = ws.Cells(4 + i, 9 + p).Value * ws.Cells(4 + p, 4).Value  ' win x efficiency
            tot = tot + e(p)
        Next p
        run = 0
        If tot <= 0 Then
            For p = 1 To nP: cum(i, p) = p / nP: Next p
        Else
            For p = 1 To nP
                run = run + e(p)
                cum(i, p) = run / tot
            Next p
        End If
    Next i

    Dim threshold As Long: threshold = ws.Range("C14").Value   ' 302
    Dim nm(1 To nP) As String
    For p = 1 To nP: nm(p) = ws.Cells(4 + p, 3).Value: Next p   ' C5:C10

    Dim majWins(1 To nP) As Long, largest(1 To nP) As Long, sumSeats(1 To nP) As Double
    Dim hung As Long, tieLargest As Long
    Randomize

    Dim sName As Long, k As Long, st As Long
    Dim r As Double, ps(1 To nP) As Long
    Dim maxv As Long, cntmax As Long, idx As Long, anyMaj As Boolean
    For sName = 1 To nSims
        For p = 1 To nP: ps(p) = 0: Next p
        For st = 1 To nStates
            For k = 1 To seats(st)
                r = Rnd()
                For p = 1 To nP
                    If r < cum(st, p) Then ps(p) = ps(p) + 1: Exit For
                Next p
            Next k
        Next st
        anyMaj = False: maxv = -1: cntmax = 0: idx = 0
        For p = 1 To nP
            sumSeats(p) = sumSeats(p) + ps(p)
            If ps(p) >= threshold Then majWins(p) = majWins(p) + 1: anyMaj = True
            If ps(p) > maxv Then
                maxv = ps(p): idx = p: cntmax = 1
            ElseIf ps(p) = maxv Then
                cntmax = cntmax + 1
            End If
        Next p
        If Not anyMaj Then hung = hung + 1
        If cntmax = 1 Then largest(idx) = largest(idx) + 1 Else tieLargest = tieLargest + 1
    Next sName

    Application.ScreenUpdating = False
    mc.Range("C6").Value = nSims
    For p = 1 To nP
        mc.Cells(8 + p, 2).Value = nm(p)
        mc.Cells(8 + p, 3).Value = majWins(p)
        mc.Cells(8 + p, 4).Value = majWins(p) / nSims
        mc.Cells(8 + p, 5).Value = sumSeats(p) / nSims
        mc.Cells(8 + p, 6).Value = largest(p)
        mc.Cells(8 + p, 7).Value = largest(p) / nSims
    Next p
    mc.Cells(9 + nP, 3).Value = hung
    mc.Cells(9 + nP, 4).Value = hung / nSims
    mc.Cells(10 + nP, 3).Value = tieLargest
    mc.Cells(10 + nP, 4).Value = tieLargest / nSims
    Application.ScreenUpdating = True

    MsgBox nSims & " elections simulated." & vbCrLf & vbCrLf & _
           "No overall majority in " & Format(hung / nSims, "0.0%") & " of runs." & vbCrLf & _
           "See the table for each party's majority wins, average seats and how often it finished largest.", _
           vbInformation, "Monte Carlo Results"
End Sub
