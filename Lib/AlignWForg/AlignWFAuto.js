//-------------------------------------------------------------------
//  SCRIPT NAME:      AlignWFAuto.js
//  VERSION:          6.02
//  FUNCTIONALITY:    execute to align the write field
//  AUTHOR:           A. Rampe, Raith Company
//  LAST MODIFIED:    24.06.2010 by A. Flekler, Raith Company
//-------------------------------------------------------------------

// now calculate correction values
App.Exec("GetListWfMarks()");

// get successfully scaned marks
var AutoMarksStored = App.GetFloatVariable("AlignWriteField.AutoMarksStored");

// get unsuccessfully scaned marks
var AutoMarksFailed = App.GetFloatVariable("AlignWriteField.AutoMarksFailed");

// get number of required marks
var MinAutoMarks = App.GetFloatVariable("AlignWriteField.MinAutoMarks");

// get action, if number of marks is less than required
var AutoMarkMode = App.GetFloatVariable("AlignWriteField.AutoMarkMode");


if ( AutoMarksStored >= MinAutoMarks )
	App.Exec("SendCorrection()");
else
	Column.ClearAlignment();
	

// reset marks counter
App.SetFloatVariable("AlignWriteField.AutoMarksStored", 0);
App.SetFloatVariable("AlignWriteField.AutoMarksFailed", 0);