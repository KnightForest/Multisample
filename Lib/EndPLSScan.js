//-------------------------------------------------------------------
//    SCRIPT NAME:      EndPLSScan.js
//    VERSION:          6.01
//    FUNCTIONALITY:    running after PLS scan
//    AUTHOR:           A. Rampe, Raith Company
//    LAST MODIFIED:    23.07.2014 by A. Flekler, Raith Company
//-------------------------------------------------------------------

App.SetBoolVariable("VARIABLES.PatterningIsRunning", false);
// execute user script
    ExecUserScript("EndPLSScan.js");
