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
	{	
		App.ErrMsg(0,0,"ALIGNE JONGE")
		App.Exec("SendCorrection()");
	}
	else
	{
		Column.ClearAlignment();
	}
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
function FileExists(filespec)
{
   var fso, s = filespec;
   fso = new ActiveXObject("Scripting.FileSystemObject");
   if (fso.FileExists(filespec))
      s = 1;
   else 
      s = 0;
   return(s);
}

function PreciseRound(num, decimals) 
{
	var t=Math.pow(10, decimals);   
 	return (Math.round((num * t) + (decimals)*((10 / Math.pow(100, decimals)))) / t).toFixed(decimals);
}

p3 = ExpandPath("%userroot%\\System\\");
scanini = App.OpenIniFile(p3 + "Scan.ini");
logflag = scanini.ReadString("Interact","log","0");
logpath = scanini.ReadString("Interact","logfile", "");
//Gfilepath = scanini.ReadString("Interact", "path", "")
i = scanini.ReadString("Interact", "sample_n", "");
nx = scanini.ReadString("Interact","nx", "");
ny = scanini.ReadString("Interact","ny", "");
su = PreciseRound(Stage.U, 2);
sv = PreciseRound(Stage.V, 2);
dinges = App.OpenIniFile(logpath);
if (logflag == 1)
{
	dinges.WriteString("Failed GDSII markers S" + i, "Structure nx/ny[" + nx + ";" + ny +  "] - Local Stage Coord[" + su + ";" + sv + "]", AutoMarksFailed);
}


