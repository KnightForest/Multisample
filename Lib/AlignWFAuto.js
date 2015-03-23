//-------------------------------------------------------------------
//  SCRIPT NAME:      AlignWFAuto.js
//  VERSION:          6.02
//  FUNCTIONALITY:    execute to align the write field
//  AUTHOR:           A. Rampe, Raith Company
//  LAST MODIFIED:    12-03-2013 by J. Ridderbos, University of Twente
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


var i = App.GetFloatVariable("AlignWriteField.AlignmentIteration");
if (i == -1) i = 0;

if (i == 0) 
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
i = (i +1) % n; //n is number of total exposureloops

App.SetFloatVariable("AlignWriteField.AlignmentIteration",i);


// reset marks counter
App.SetFloatVariable("AlignWriteField.AutoMarksStored", 0);
//App.SetFloatVariable("AlignWriteField.AutoMarksFailed", 0);