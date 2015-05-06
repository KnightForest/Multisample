//-------------------------------------------------------------------
//  SCRIPT NAME:      AlignWFAuto.js
//  VERSION:          6.02
//  FUNCTIONALITY:    execute to align the write field
//  AUTHOR:           A. Rampe, Raith Company
//  LAST MODIFIED:    30-04-2015 by J. Ridderbos, University of Twente
//-------------------------------------------------------------------

// now calculate correction values
App.Exec("GetListWfMarks()");

// get successfully scanned marks
var AutoMarksStored = App.GetFloatVariable("AlignWriteField.AutoMarksStored");

// get unsuccessfully scanned marks
var AutoMarksFailed = App.GetFloatVariable("AlignWriteField.AutoMarksFailed");

// get number of required marks
var MinAutoMarks = App.GetFloatVariable("AlignWriteField.MinAutoMarks");

// get action, if number of marks is less than required
var AutoMarkMode = App.GetFloatVariable("AlignWriteField.AutoMarkMode");


var ni = App.GetFloatVariable("AlignWriteField.AlignmentIteration");
if (ni == -1) ni = 0;

if (ni == 0) 
{ //first alignment procedure
	if ( AutoMarksStored >= MinAutoMarks )
		App.Exec("SendCorrection()");
	else
		Column.ClearAlignment();
}
else
{
	Column.ClearAlignment();
}

var n = parseInt(App.GetVariable("Exposure.ExposureLoops"),10);
ni = (ni +1) % n; //n is number of total exposureloops

App.SetFloatVariable("AlignWriteField.AlignmentIteration",ni);

// reset marks counter
App.SetFloatVariable("AlignWriteField.AutoMarksStored", 0);
//App.SetFloatVariable("AlignWriteField.AutoMarksFailed", 0);

scanini = App.OpenIniFile(Glib + "GDSII Linescan.ini");
logflag = scanini.ReadString("Interact","log","0")
logfilepath = scanini.ReadString("Interact","logfile", "")
nx = scanini.ReadString("Interact","nx", "")
ny = scanini.ReadString("Interact","ny", "")
if (logflag == 1)
{
	logfile.WriteString("Failed markers S" + i, "Device nx/ny[" + nx + ";" + ny +  "]", "Local Stage Coord[" + Stage.U + ";" + Stage.V + "] : " AutoMarksFailed);
}
