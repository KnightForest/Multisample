//    Copyright 2013-2014 Joost Ridderbos

//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.

//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.

//    You should have received a copy of the GNU General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.

// Future plans:
// - Change procedure text/behaviour
// - Add dynamic WF size compatbility --> Working areas?
// - Build in more abort buttons
// - Drive z motor to 10.000 after patterning finishes
// - Add check for design pathlength limit of 100 chars
// - Allow for aperture/voltage change
// 		-> Save WF parameters per beam setting
//		-> Save and load column parameters
//		-> Load dataset from positionlist?
// - Add options to read everything except UV alignment from file
// - Separate markertypes/procedures in separate files (for editing by users)
// - Add more checks for user input
// - Add time estimation calculation
// - Add logdata:
//		-> Layer61 scan results
//		-> Progress bar (together with time estimation)
//		-> If 
// - ? Fix SetSvars function
// - Add noise cancelling 
// - For personal version: change position EBL markers to 2nd row


function Succes(beamoffflag)                                                       //-- Called if function 'write' was successful
{
//   App.Exec("OpenDatabase(PhotolithoConnect)");                         //Opens the GDSII database
//   OriginCorrection()                                                   //Runs function OriginCorrection() defined below
   Install(1);
   Stage.JoystickEnabled = true;                                        //Turns joystick back on
   App.SetFloatVariable("AlignWriteField.AutoMarksFailed", 0);          //Resets failed automarks counter
   App.SetVariable("Adjust.MinAutoMarks","3");                          //Resets MinAutoMarks back to 3 (from 2)
   App.ErrMsg(EC_INFO, 0, "Great Succes!");                                       //Displays success message ;)
}

function isEven(n)
{
	if (parseInt(n)%2 !=0)
	{
		n = 0;
	}
	else
	{
		n = 1;
	}
	return(n)
}

function MeasBeamCurrent()
{
   if (App.ErrMsg(EC_YESNO, 0, "Do you want to measure the beam current?") == EA_YES)                        //Asks user to perform beam current measurement + dwelltime corrections
      {
      if ( Column.CheckConnection() )                                   //If answer is YES, measurement is performed
         {
		 Stage.X = -30
		 Stage.Y = 30
		 Stage.WaitPositionReached(); 
         BeamCurrent(true, true);                                       //Saves value and returns result in a popup
         }
       }
}

function StepsizeDwelltime()
{
    var msg_setareastepsize = "Set AREA stepsize for patterning in nm";

	var msg_rounding = "Will be rounded up to a multiple of ";

	var msg_setlinestepsize = "Set LINE stepsize in nm";

	var msg_higherthan = "nm: (Must be at least higher than ";

	var beamspeed = new Array();
	minstepsize=App.GetSysVariable("Beamcontrol.WFBasicStepSize1000");
	advisedbeamspeed = 0.003;                                             //Sets the advised beamspeed in m/s
    areaminstepsize = minstepsize*1000*Math.ceil(App.GetVariable("Beamcurrent.BeamCurrent")/(advisedbeamspeed*App.GetVariable("Exposure.ResistSensitivity")*Math.pow(10,-2))/(minstepsize*1000)); //Calculates advised minumum area stepsize based on beamspeed and dose
    
    stepsize = (minstepsize*Math.ceil(App.InputMsg(msg_setareastepsize, msg_rounding + minstepsize*1000 + msg_higherthan + areaminstepsize + "nm)", areaminstepsize)/(1000*minstepsize))).toString(); //Asks user to set stepsize for patterning
    
    if (stepsize < minstepsize) stepsize=minstepsize;                    //If the user set stepsize is smaller than the minimum stepsize, it is return to this minimum value
    	stepsizeline=(minstepsize*Math.ceil(App.InputMsg(msg_setlinestepsize, msg_rounding + minstepsize*1000 + "nm:", minstepsize*1000)/(1000*minstepsize))).toString(); //Asks user to set stepsize for patterning
    if (stepsizeline < minstepsize) 
    	stepsizeline = minstepsize;          //If the user set stepsize is smaller than the minimum stepsize, it is return to this minimum value
    App.SetVariable("Exposure.CurveDose", "150");                        //Sets curve dose to 150 (generally not used)
    App.SetVariable("Exposure.DotDose", "0.01");                          //Sets dot dose to 0.1
    App.SetVariable("Exposure.ResistSensitivity", "150");                 //Sets area dose to 150
    App.SetVariable("Exposure.LineDose", "500");                         //Sets line dose to 500
    App.SetVariable("Variables.MetricStepSize", stepsize);               //Sets area stepsize y-direction to defined area stepsize
    App.SetVariable("Variables.MetricLineSpacing", stepsize);            //Sets area stepsize x-direction to defined area stepsize
    App.SetVariable("BeamControl.CurveStepSize", stepsize);              //Sets curved element stepsize to defined area stepsize
    App.SetVariable("BeamControl.CurveLineSpacing", stepsize);           //Sets curved line stepsize to defined area stepsize
    App.SetVariable("BeamControl.SplStepSize", stepsizeline);            //Sets line stepsize to defined area stepsize
    App.Exec("SetExposureParameter()");                                   //Actually activates the previous defined settings
    App.Exec("CorrectCurvedElementsDwellTime()");                        //Corrects curved elements dwelltimes
    App.Exec("CorrectDotDwelltime()");                                   //Corrects dot dwelltimes
    App.Exec("CorrectSPLDwelltime()");                                   //Corrects line dwelltimes
	App.Exec("CorrectDwelltime()");                                      //Corrects area dwelltimes
			                                                                     
                                                                        //Lines below calculate the resulting beam speed based on user stepsize
//			beamspeed[0] = App.GetVariable("Beamcurrent.BeamCurrent")*Math.pow(10,-9)/(stepsize*Math.pow(10,-6)*App.GetVariable("Exposure.CurveDose")*Math.pow(10,-2));
   beamspeed[1] = App.GetVariable("Beamcurrent.BeamCurrent")*Math.pow(10,-9)/(stepsize*Math.pow(10,-6)*App.GetVariable("Exposure.ResistSensitivity")*Math.pow(10,-2)); //Calculates area beamspeed
   beamspeed[2] = App.GetVariable("Beamcurrent.BeamCurrent")*Math.pow(10,-9)/(App.GetVariable("Exposure.LineDose")*Math.pow(10,-10));  //Calculates line beamspeed


   criticalbeamspeed = 0.005;
   bflag = 0;
   if (beamspeed[0] > criticalbeamspeed)                                            //Next lines checks if the calculated beamspeed is not higher than 5mm/s, else it gives a warning.
      { 
      App.Errmsg(EC_INFO ,0 , "WARNING! Curved Area beam speed greater than 5mm/s: " + beamspeed[0]*1000 + "mm/s, increase stepsize or reduce beamcurrent.");
      bflag = 1;
      }
   if (beamspeed[1] > criticalbeamspeed) 
      {
      App.Errmsg(EC_INFO ,0 , "WARNING! Area beam speed greater than 5mm/s:    " + Math.ceil(beamspeed[1]*10000)/10 + "mm/s, increase stepsize or reduce beamcurrent.");
      bflag = 1;
      }
   if (beamspeed[2] > criticalbeamspeed) 
      {
      App.Errmsg(EC_INFO ,0 , "WARNING! Line beam speed greater than 5mm/s:    " + Math.ceil(beamspeed[2]*10000)/10 + "mm/s, reduce beamcurrent.");
      bflag = 1;
      }
   if (bflag == 1)                                                      //If one of the beamspeeds was too high, the user is asked if they want to continue anyway.
      {
      if (App.ErrMsg(EC_YESNO, 0, "Continue with high beamspeed? (Okay until 6 mm/s)" ) == EA_NO) Abort();
      }
   bflag = 0; 
}

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

function OriginCorrection()                                             //-- Sets current location as local origin
{
   Stage.LocalAlignment();                       //Switch to local UVW
   Stage.ResetAlignment();                  //Delete previous alignments
   Stage.SetAlignPointUV(1, true, 0, 0);                       //Set UV to 0,0
   Stage.SetAlignPointXY(1, Stage.X, Stage.Y);                       //Define current location in X and Y as alignment point
   App.SetVariable("Autofocus.MarkValid1", "1");
   App.SetVariable("Autofocus.MarkValid2", "1");
   App.SetVariable("Autofocus.MarkValid3", "1");
   Stage.SetAlignment();                       //Perform alignment on this one point
}

function Abort()                                                        //-- Aborts script execution
{                                                                       //For details, check function Succes()
   Install(1);
   Stage.JoystickEnabled = true;
   App.SetVariable("Adjust.MinAutoMarks","3");
   throw new Error('Execution cancelled by user');                      //Interrupts script by trowing error
}

function Detectnums()
{
	for (i = 1; i <= 10; i++)
	{
		var it = "S" + i

		if (Gsampleini.SectionExists(it)==false )
		{
		Gnums = parseInt(i - 1);
		if (App.ErrMsg(4, 0, Gnums + " chips are detected. Is this correct?")==7)
		{
			App.ErrMsg(0,0, "Please do all kinds of stuff to make things not wrong.");
			Abort();
		}
        return(Gnums);
		break;
		}
	}
}

function ResetPanicbutton()
{
	var panicini = App.OpenInifile(Gfilepath + "Panic.txt");
	var panicswitch = parseInt(panicini.WriteInteger("Panicswitch","panic",0));
}

function Panicbutton()
{
	var panicini = App.OpenInifile(Gfilepath + "Panic.txt");
	var panicswitch = parseInt(panicini.ReadInteger("Panicswitch","panic",0));
	if (panicswitch != 0)
	{
		App.ErrMsg(0,0,"Panic button initiated. Script execution terminated.");
		Abort();
	}
}

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}
	   
function Load()
{	   
    var S = createArray(20,6,Gnums+1);
	//First load the list of parameters applicable to all loaded samples:
	S[9][4][1] = parseFloat(Gsampleini.ReadString("GS","Procedure", "1"));
	st = S[9][4][1]
	S[11][4][1] = parseFloat(Gsampleini.ReadString("GS","n-Samples", "1"));
	
    for (i = 1; i <= Gnums; i++)
    {
		it = "S" + i; 
		
	    for (j=1; j <= 3; j++)
		{
			S[1][j][i] = parseFloat(Gsampleini.ReadString(it, "U" + j, "0"));
			S[2][j][i] = parseFloat(Gsampleini.ReadString(it, "V" + j, "0"));
			S[3][j][i] = parseFloat(Gsampleini.ReadString(it, "WD" + j, "0"));
			S[4][j][i] = parseFloat(Gsampleini.ReadString(it, "X" + j, "0"));
			S[5][j][i] = parseFloat(Gsampleini.ReadString(it, "Y" + j, "0"));
			S[6][j][i] = parseFloat(Gsampleini.ReadString(it, "Z" + j, "0"));
			S[7][j][i] = parseFloat(Gsampleini.ReadString(it, "MarkValid" + j, "0"));
		}

		if (st == 1 || st == 3)
		{
			S[1][4][i] = (Gsampleini.ReadString("GS","ExpLayers", "0"));
			S[2][4][i] = parseInt(Gsampleini.ReadString("GS", "Nx", "0"));
			S[3][4][i] = parseInt(Gsampleini.ReadString("GS", "Ny", "0"));
			S[4][4][i] = parseFloat(Gsampleini.ReadString("GS", "Sx", "0"));
			S[5][4][i] = parseFloat(Gsampleini.ReadString("GS", "Sy", "0"));
			S[6][4][i] = parseFloat(Gsampleini.ReadString("GS", "UuShift", "0"));			
			S[7][4][i] = parseFloat(Gsampleini.ReadString("GS", "VvShift", "0"));
			S[8][4][i] = Gsampleini.ReadString("GS","Name", "0");
			S[10][4][i] = parseFloat(Gsampleini.ReadString("GS", "Markprocedure", "1"));
			S[12][4][i] = Gsampleini.ReadString("GS", "L61", "0"); 
			S[3][5][i] = (Gsampleini.ReadString("GS", "GDSII", "0"));
			S[4][5][i] = (Gsampleini.ReadString("GS", "Struct", "0")); 
						
			if (st == 3)
			{
				S[1][5][i] = (Gsampleini.ReadString("GS", "WF", "0"));
				S[2][5][i] = (Gsampleini.ReadString("GS", "ColMode", "0"));
			}
		}
  
		if (st == 2 || st == 4)
		{
			S[1][4][i] = (Gsampleini.ReadString(it, "ExpLayers", "0"));
			S[2][4][i] = parseInt(Gsampleini.ReadString(it, "Nx", "0"));
			S[3][4][i] = parseInt(Gsampleini.ReadString(it, "Ny", "0"));
			S[4][4][i] = parseFloat(Gsampleini.ReadString(it, "Sx", "0"));
			S[5][4][i] = parseFloat(Gsampleini.ReadString(it, "Sy", "0"));
			S[6][4][i] = parseFloat(Gsampleini.ReadString(it, "UuShift", "0"));			
			S[7][4][i] = parseFloat(Gsampleini.ReadString(it, "VvShift", "0"));
			S[8][4][i] = Gsampleini.ReadString(it, "Name", "0");
			S[10][4][i] = parseFloat(Gsampleini.ReadString(it, "Markprocedure", "1"));
			S[12][4][i] = Gsampleini.ReadString(it, "L61", "0");
			S[3][5][i] = (Gsampleini.ReadString(it, "GDSII", "0"));
			S[4][5][i] = (Gsampleini.ReadString(it, "Struct", "0"));

			if (st == 4)
			{
				S[1][5][i] = (Gsampleini.ReadString(it, "WF", "0"));
				S[2][5][i] = (Gsampleini.ReadString(it, "ColMode", "0"));
			}
		}
	}
	App.ErrMsg(0,0,"Multisample.txt successfully loaded.")	
    return(S)
}

function CollectSD(st)
{
    var S = createArray(20,6,Gnums+1);
	mflag = 0;
	
	Gnums = App.InputMsg("Select amount of chips", "Select a number 1-20", "1");
    
	if (Gnums != parseInt(Gnums) || Gnums > 20)
	{
		App.ErrMsg(0,0,"Input is no integer or > 20.");
		Abort();
	}
	
	for (i = 1; i <= Gnums; i++)   
	{
		it = "chip " + i;
		
		if (i <= Gnums && mflag == 0)
		{
				
			//if (mflag == 1) break;
			if (st == 1 || st == 3) App.Errmsg(0,0,"Enter data for all used chips in the following dialogue boxes.");
			if (st == 2 || st == 4) App.Errmsg(0,0,"Enter data for " + it + " in the following dialogue boxes.");
			
			S84 = App.InputMsg("Sample name","Enter name for sample(s) (for log)","");
			
			if (st == 3 || st == 4)
			{
				//S15 = App.InputMsg("Choose writefield in um", "Select 200, 100, 50, 25 or 10", "100");
				//S25 = App.InputMsg("Column settings", "Type in the name of the column dataset.", "20kV 10um 10mm");
				S15 = 100
				currpath = App.GetVariable("GDSII.Database");
				fex = 0;
				while (fex != 1)
				{
					S35 = App.InputMsg("Select GDSII database folder.","Enter the full path", currpath);
					if (S35 == "") Abort();
					fex = FileExists(S35);
					
					if (fex != 1)
					{
						App.Errmsg(0,0,"Please enter correct path")
					}
					if (S35 === "") S35 = currpath
					currstruct = App.GetVariable("Variables.StructureName");
				}
				S45 = App.InputMsg("Choose structure", "Type the name of the structure (case sensitive):", currstruct);
				if (S45 === "") S45 = currstruct
			}
			
			S104 = parseInt(App.InputMsg("Select WF alignment marker procedure", "Select 1 for Photo-markers, 2 for Photo+EBL markers, 3 for no WF align, 4 for Photo+EBL on first device only", "1"));
			if (App.ErrMsg(4,0,"Do you want to use layer 61 (GDSII autoscans)?")==EA_YES)
			{
				tl = App.InputMsg("Select layer", "Select layer(s) to use together with layer 61 (separate by ';')","")
				S124 = 61 + ";" + tl;
				if (App.ErrMsg(4,0,"Do you want to write other layers in a global alignment?")==EA_YES)
				{
					S14 = App.InputMsg("Choose layers", "Select (separate by ';') ", "0");
				}
				else
				{
					S14 = -1;
				}
			}
			else
			{
				S124 = -1;
				S14 = App.InputMsg("Choose layers", "Select layers to write (separate by ';') ", "0");
			}
			S24 = App.InputMsg("Define chip dimensions in x (U)", "Select number of structures: x (U)", "2");
			S34 = App.InputMsg("Define chip dimensions in y (V)", "Select number of structures: y (V)", "2");
			S44 = App.InputMsg("Define structure spacing in (U)", "Select structure spacing in mm: x (U)", "5");
			S54 = App.InputMsg("Define structure spacing in (V)", "Select structure spacing in mm: y (V)", "5");
			S64 = App.InputMsg("Define Global-Local shift (U) for 1st structure", "Select shift in mm: x (U)", "0");
			S74 = App.InputMsg("Define Global-Local shift (V) for 1st structure", "Select shift in mm: v (V)", "0");
			//S44 = 5;
			//S54 = 5;
			//S64 = 0;
			//S74 = 0;
			S94 = st;
				
			if (st == 1 || st == 3) mflag = 1;
				
		}
		S[1][4][i] = S14 + "";
		S[2][4][i] = parseInt(S24);
		S[3][4][i] = parseInt(S34);
		S[4][4][i] = parseFloat(S44);
		S[5][4][i] = parseFloat(S54);
		S[6][4][i] = parseFloat(S64);
		S[7][4][i] = parseFloat(S74);
		S[8][4][i] = S84;
		S[10][4][i] = parseFloat(S104);
		S[12][4][i] = S124 + "";
		//Add a list of parameter that are always applicable to all loaded samples.
		if (i==1)
		{
			S[9][4][1] = parseFloat(S94);
			S[11][4][1] = Gnums	
		}
		
			
		if (st == 3 || st == 4)
		{
		S[1][5][i] = S15 + ""		
		//S[2][5][i] = S25 + ""
		S[3][5][i] = S35
		S[4][5][i] = S45 + ""
		}
	}
	SetSvars(S,i,st)
	S = CollectUV(st, S);

 return(S)
}

function CollectUV(st, S)
{
    App.ErrMsg(0,0,"Collecting three point alignments for all chips commences. Now, align the first chip. USE GLOBAL ALIGNMENT!");
	for (i = 1; i <= Gnums; i++)
    {
	    markprocedure = S[10][4][i];
		Stage.GlobalAlignment();
	    Stage.ResetAlignment();

	    if (st == 1 || st == 2)
		{
			if (App.ErrMsg(8,0,"Perform UV alignment on sample chip " + i + " of " + Gnums + ". The now opened GDSII file and structure are logged and used for exposure.") == 2)
			{
				Logdata(S, st);
				Abort();
			}
		}
		else
		{
			if (App.ErrMsg(8,0,"Perform UV alignment on sample chip " + i + " of " + Gnums + ".") == 2)
			{
				Logdata(S, st);
				Abort();
			}		
		}
		
		if (st == 3 || st == 4)
		{	
			App.Exec("OpenDatabase(" + S[3][5][i] + ")");
			App.Exec("ViewStructure(" + S[4][5][i] + ")");
		}
	    App.Exec("Halt()");

		AlignWF(markprocedure, 0);

	    App.ErrMsg(0,0,"Check UV alignment + focus after WF change of sample chip " + i + " of " + Gnums);
	    App.Exec("Halt()");
		
		if (st == 1 || st == 2)
		{
			S[3][5][i] = App.GetVariable("GDSII.Database");
			S[4][5][i] = App.GetVariable("Variables.StructureName");
		}
		
	    for (j = 1; j <= 3; j++)
		{
			m = App.GetVariable("GLOBALADJUST.Mark" + j).split(",");
			maf = App.GetVariable("AUTOFOCUS.Mark" + j).split(",");
			wd = App.GetVariable("AUTOFOCUS.WD" + j);

			S[1][j][i] = parseFloat(m[1]);
			S[2][j][i] = parseFloat(m[2]);
			S[3][j][i] = wd + "";
			S[4][j][i] = parseFloat(m[3]);
			S[5][j][i] = parseFloat(m[4]);
			S[6][j][i] = maf[2] + "";
			S[7][j][i] = parseFloat(m[0]);
	    }
	}
    return (S)
}

function Logdata(S, st)
{
	datesp = Date().split(":");
    date = datesp[0] + "." + datesp[1] + "." + datesp[2];
	Glogfilename[2] = "Log " + date + ".txt"
    Glogini = App.OpenInifile(Glogfilename[1] + Glogfilename[2]);
	Glogini.Writestring("GS","Procedure", S[9][4][1]);
	Glogini.Writestring("GS","n-Samples", S[11][4][1]);
	
	if (st == 1 || st == 3)
	{
	    Glogini.WriteString("GS", "ExpLayers", S[1][4][1] + "");
	    Glogini.WriteString("GS", "Nx", S[2][4][1] + "");
	    Glogini.WriteString("GS", "Ny", S[3][4][1] + "");
	    Glogini.WriteString("GS", "Sx", S[4][4][1] + "");
	    Glogini.WriteString("GS", "Sy", S[5][4][1] + "");
		Glogini.WriteString("GS", "UuShift", S[6][4][1] + "");
		Glogini.WriteString("GS", "VvShift", S[7][4][1] + "");
		Glogini.Writestring("GS", "Name", S[8][4][1]);
		Glogini.Writestring("GS", "Markprocedure", S[10][4][1]);
		Glogini.Writestring("GS", "L61", S[12][4][1]);	
		Glogini.WriteString("GS", "GDSII", S[3][5][1] + "");
		Glogini.WriteString("GS", "Struct", S[4][5][1] + "");
		if (st == 3)
			{
			Glogini.WriteString("GS", "WF", S[1][5][1] + "");
			Glogini.WriteString("GS", "ColMode", S[2][5][1] + "");
			}
	}	

    for (i = 1; i <= Gnums; i++)
    {
        it = "S" + i; 
		
		if (st == 2 || st == 4)
		{
			Glogini.WriteString(it, "ExpLayers", S[1][4][i] + "");
			Glogini.WriteString(it, "Nx", S[2][4][i] + "");
			Glogini.WriteString(it, "Ny", S[3][4][i] + "");
			Glogini.WriteString(it, "Sx", S[4][4][i] + "");
			Glogini.WriteString(it, "Sy", S[5][4][i] + "");
			Glogini.WriteString(it, "UuShift", S[6][4][i] + "");
			Glogini.WriteString(it, "VvShift", S[7][4][i] + "");
			Glogini.Writestring(it,"Name", S[8][4][i]);
			Glogini.Writestring(it,"Markprocedure", S[10][4][i]);	
			Glogini.Writestring(it, "L61", S[12][4][i]);
			Glogini.WriteString(it,"GDSII", S[3][5][i] + "");
			Glogini.WriteString(it,"Struct", S[4][5][i] + "");
			if (st == 4)
			{
				Glogini.WriteString(it,"WF", S[1][5][i] + "");
				Glogini.WriteString(it,"ColMode", S[2][5][i] + "");
			}
		}
		
		for (j = 1; j <= 3; j++)
		{	          
			Glogini.WriteString(it, "U" + j, S[1][j][i] + "");
			Glogini.WriteString(it, "V" + j, S[2][j][i] + "");
			Glogini.WriteString(it, "WD" + j, S[3][j][i] + "");
			Glogini.WriteString(it, "X" + j, S[4][j][i] + "");
			Glogini.WriteString(it, "Y" + j, S[5][j][i] + "");
			Glogini.WriteString(it, "Z" + j, S[6][j][i] + "");
			Glogini.WriteString(it, "MarkValid" + j, S[7][j][i] + "");
		}
			
	}	
    return(Glogfilename)
}

function AlignUV(S, i, st)
{
	Stage.ResetAlignment(); 
	Stage.SetAlignPointUV(1, S[7][1][i], S[1][1][i], S[2][1][i])     ; 
	Stage.SetAlignPointXY(1, S[4][1][i], S[5][1][i])   ; 
	Stage.SetAlignPointUV(2, S[7][2][i], S[1][2][i], S[2][2][i])     ;  
	Stage.SetAlignPointXY(2, S[4][2][i], S[5][2][i])   ;                      
	Stage.SetAlignPointUV(3, S[7][3][i], S[1][3][i], S[2][3][i])     ; 
	Stage.SetAlignPointXY(3, S[4][3][i], S[5][3][i])   ;

	App.SetVariable("VIMOT.Autofocus", "ON");
	App.SetVariable("Autofocus.CorrectFocus", "ON");
	App.SetVariable("Autofocus.Mark1", S[4][1][i] + "," + S[5][1][i] + "," + S[6][1][i]);
	App.SetVariable("Autofocus.Mark2", S[4][2][i] + "," + S[5][2][i] + "," + S[6][2][i]);
	App.SetVariable("Autofocus.Mark3", S[4][3][i] + "," + S[5][3][i] + "," + S[6][3][i]);
	App.SetVariable("Autofocus.MarkValid1", S[7][1][i]);
	App.SetVariable("Autofocus.MarkValid2", S[7][2][i]);
	App.SetVariable("Autofocus.MarkValid3", S[7][3][i]);
	App.SetVariable("Autofocus.WD1", S[3][1][i] + "");
	App.SetVariable("Autofocus.WD2", S[3][2][i] + "");
	App.SetVariable("Autofocus.WD3", S[3][3][i] + "");
 
	App.SetVariable("LOCALAUTOFOCUS.Mark1", S[4][1][i] + "," + S[5][1][i] + "," + S[6][1][i]);
	App.SetVariable("LOCALAUTOFOCUS.Mark2", S[4][2][i] + "," + S[5][2][i] + "," + S[6][2][i]);
	App.SetVariable("LOCALAUTOFOCUS.Mark3", S[4][3][i] + "," + S[5][3][i] + "," + S[6][3][i]); 
	App.SetVariable("LOCALAUTOFOCUS.MarkValid1", S[7][1][i]);
	App.SetVariable("LOCALAUTOFOCUS.MarkValid2", S[7][2][i]);
	App.SetVariable("LOCALAUTOFOCUS.MarkValid3", S[7][3][i]); 
	App.SetVariable("LOCALAUTOFOCUS.WD1", S[3][1][i] + "");
	App.SetVariable("LOCALAUTOFOCUS.WD2", S[3][2][i] + "");
	App.SetVariable("LOCALAUTOFOCUS.WD3", S[3][3][i] + "");   

	Stage.SetAlignment();
}

function Install(restoreflag)
{
	App.SetVariable("Automation/Links.0",Gfilepath + Gsn + ".js")
	fso = new ActiveXObject("Scripting.FileSystemObject");
	if (fso.FolderExists(Gfilepath))
	{
	}
	else
	{
		fso.CreateFolder(Gfilepath)
	}
	p1 = ExpandPath("%userroot%\Record\\ScanMacros\\");
	fso.CopyFile (Glib + "Multisample WF align.rec", p1, true);
	p2 = ExpandPath("%root%\Lib\\System\\");
	if (restoreflag == 1)
	{
	fso.CopyFile (Glib + "AlignWForg\\AlignWFAuto.js", p2, true);
	}
	else
	{
	fso.CopyFile (Glib + "AlignWFAuto.js", p2, true);
	}
	fso.Close;
}

function InstallWFAlign(markertype, threshold)
{	
	p3 = ExpandPath("%userroot%\System\\");
	if (markertype == 61)
	{
		WFalignini = App.OpenIniFile(Glib + "GDSII Linescan.ini");
		parlist = WFalignini.ReadSection("Automatic procedure during exposure").split(",");
		scanini = App.OpenIniFile(p3 + "Scan.ini");
		scanini.DeleteSection("Automatic procedure during exposure");
		for (q = 0; q < parlist.length; q ++) 
		{
			par = WFalignini.ReadString("Automatic procedure during exposure", parlist[q], "0");
			scanini.WriteString("Automatic procedure during exposure", parlist[q], par);
		}
		threshold = "Mode:0,L1:45,L2:55,Profile:1,Min:150.0,Max:350.0,LFL:0,RFL:1,LNo:1,RNo:1,LeftE:0.5,RightE:0.5,DIS:0,ZL:0,ZR:0";
	}
	else
	{
		WFalignini = App.OpenIniFile(Glib + "Multisample WF align.ini");
		parlist = WFalignini.ReadSection("Multisample WF align").split(",");
		scanini = App.OpenIniFile(p3 + "Scan.ini");
		scanini.DeleteSection("Multisample WF align");
		for (q = 0; q < parlist.length; q ++) 
		{
			par = WFalignini.ReadString("Multisample WF align", parlist[q], "0");
			scanini.WriteString("Multisample WF align", parlist[q], par);
		}
	}
	var iniTest = App.OpenIniFile(ExpandPath("%userroot%\System\\LineScanFilter.ini"));//Opens .ini file threshold algorithm            
    
	if (iniTest)                                                     //Loop deletes previous entry and enters 'threshold' in Writefield Alignment
    { 
        if ( iniTest.SectionExists("Threshold")==true )                //If the header Threshold is found, it is deleted
        iniTest.DeleteKey("Threshold", "Align write field"); 
        iniTest.WriteString("Threshold", "Align write field", threshold);//The new values are entered from string 'threshold'  
    }
	
	App.Exec("ResetModule(Scan Manager)");
}

function AutoWFAlign(markertype) 
{
	WF = Column.GetWriteField();
  
	if (markertype == 11) //Definition of photomarkers
	{
	   SizeU = 10.000000
	   SizeV = 1.000000
	   StepU = 0.00400
	   StepV = 0.00400
	   PointsU = SizeU / StepU
	   PointsV = SizeV / StepV
	   StepU = StepU + ""
	   StepV = StepV + ""
	   SizeU = SizeU + ""
	   SizeV = SizeV + ""
	   MarkOffsetU = 7 + ""
	   MarkOffsetV = 7 + ""
	   MarkPlaceU = WF/2 - (SizeU / 2) - MarkOffsetU + ""
	   MarkPlaceV = MarkPlaceU
	   Upos = 0.06650 + ""
	   Vpos = 0.06650 + ""
	}
	if (markertype == 12)
	{
	   SizeU = 12.000000
	   SizeV = 1.000000
	   StepU = 0.00400
	   StepV = 0.00400
	   PointsU = SizeU / StepU
	   PointsV = SizeV / StepV
	   StepU = StepU + ""
	   StepV = StepV + ""
	   SizeU = SizeU + ""
	   SizeV = SizeV + ""
	   MarkOffsetU = 7 + ""
	   MarkOffsetV = -7 + ""
	   MarkPlaceU = WF/2 - (SizeU / 2) - MarkOffsetU + ""
	   MarkPlaceV = MarkPlaceU
	   Upos = -0.06650 + ""
	   Vpos = 0.06650 + ""
	}
	if (markertype == 13)
	{
	   SizeU = 8.000000
	   SizeV = 1.000000
	   StepU = 0.00400
	   StepV = 0.00400
	   PointsU = SizeU / StepU
	   PointsV = SizeV / StepV
	   StepU = StepU + ""
	   StepV = StepV + ""
	   SizeU = SizeU + ""
	   SizeV = SizeV + ""
	   MarkOffsetU = -7 + ""
	   MarkOffsetV = -7 + ""
	   MarkPlaceU = WF/2 - (SizeU / 2) - MarkOffsetU + ""
	   MarkPlaceV = MarkPlaceU
	   Upos = -0.06650 + ""
	   Vpos = -0.06650 + ""
	}
	if (markertype == 11 || markertype == 12 || markertype == 13)
	{
		threshold = "Mode:0,L1:45,L2:55,Profile:1,Min:3500.0,Max:4700.0,LFL:0,RFL:1,LNo:1,RNo:1,LeftE:0.5,RightE:0.5,DIS:0,ZL:0,ZR:0"; //Defines threshold algorithm parameters
		//threshold = "Mode:0,L1:45,L2:55,Profile:1,Min:1.0,Max:10000.0,LFL:0,RFL:1,LNo:1,RNo:1,LeftE:0.5,RightE:0.5,DIS:0,ZL:0,ZR:0"; //Defines threshold algorithm parameters
	}
	
	if (markertype == 21) //Definition of EBL markers
	{
	   SizeU = 3.000000
	   SizeV = 1.000000
	   StepU = 0.002000
	   StepV = 0.002000
	   PointsU = (SizeU / StepU)
	   PointsV = (SizeV / StepV)
	   StepU = StepU + ""
	   StepV = StepV + ""
	   SizeU = SizeU + ""
	   SizeV = SizeV + ""
	   MarkOffsetU = 1.5 + ""
	   MarkOffsetV = 1.5 + ""
	   MarkPlaceU = WF/2 - (SizeU / 2) - MarkOffsetU + ""
	   MarkPlaceV = MarkPlaceU
	   Upos = 0.0200 + ""
	   Vpos = 0.0250 + ""
	}
	if (markertype == 22)
	{
	   SizeU = 4.000000
	   SizeV = 1.000000
	   StepU = 0.002000
	   StepV = 0.002000
	   PointsU = (SizeU / StepU)
	   PointsV = (SizeV / StepV)
	   StepU = StepU + ""
	   StepV = StepV + ""
	   SizeU = SizeU + ""
	   SizeV = SizeV + ""
	   MarkOffsetU = 1.5 + ""
	   MarkOffsetV = 1.5 + ""
	   MarkPlaceU = WF/2 - (SizeU / 2) - MarkOffsetU + ""
	   MarkPlaceV = MarkPlaceU
	   Upos = -0.0200 + ""
	   Vpos = 0.0250 + ""
	}
	if (markertype == 23)
	{
	   SizeU = 2.000000
	   SizeV = 1.000000
	   StepU = 0.002000
	   StepV = 0.002000
	   PointsU = (SizeU / StepU)
	   PointsV = (SizeV / StepV)
	   StepU = StepU + ""
	   StepV = StepV + ""
	   SizeU = SizeU + ""
	   SizeV = SizeV + ""
	   MarkOffsetU = 1.5 + ""
	   MarkOffsetV = 1.5 + ""
	   MarkPlaceU = WF/2 - (SizeU / 2) - MarkOffsetU + ""
	   MarkPlaceV = MarkPlaceU
	   Upos = -0.0200 + ""
	   Vpos = -0.0250 + ""
	}
	if (markertype == 21 || markertype == 22 || markertype == 23)
	{
		threshold = "Mode:0,L1:45,L2:55,Profile:1,Min:150.0,Max:350.0,LFL:0,RFL:1,LNo:1,RNo:1,LeftE:0.5,RightE:0.5,DIS:0,ZL:0,ZR:0";
		//threshold = "Mode:0,L1:45,L2:55,Profile:1,Min:1.0,Max:10000.0,LFL:0,RFL:1,LNo:1,RNo:1,LeftE:0.5,RightE:0.5,DIS:0,ZL:0,ZR:0"; //Defines threshold algorithm parameters
	}
	
    parlistname = new Array("SizeU","SizeV","StepU","StepV","PointsU","PointsV","MarkOffsetU","MarkOffsetV","MarkPlaceU","MarkPlaceV");
	parlist = new Array(SizeU,SizeV,StepU,StepV,PointsU,PointsV,MarkOffsetU,MarkOffsetV,MarkPlaceU,MarkPlaceV);
	if (PointsU >= 4087 || PointsV >= 4087)
	{
		App.ErrMsg(0,0,"Invalid parameters in markertype of AutoWFAlign");
		Abort();
	}
	
	multiini = App.OpenIniFile(Glib + "Multisample WF align.ini");
	for (q = 0; q < parlist.length; q ++) 
	{	
		multiini.WriteString("Multisample WF align", parlistname[q], parlist[q]);
	}
	
	multipls = App.OpenIniFile(Glib + "Multisample WF align.pls");
	multipls.DeleteSection("DATA");
	multipls.WriteString("DATA", "0,0.000000,0.000000,0.000000,0.000000,0.000000," + Upos + "," + Vpos + ",0.000000,LN,UV,Multisample WF align,STAY;,ALWF_AUTOLINE," + parlist[1] + "," + parlist[2] + "," + parlist[3] + "," + parlist[4] + ",U,16,,,,,,,,,,,,,,,,,,,,,,,0.0,15,0,1,", 0);

	InstallWFAlign(markertype, threshold);
	PList = OpenPositionList(Glib + "Multisample WF align.pls")
	App.Exec("ScanAllPositions()");
	PList.Save();
	PList.Close();
	fmarkers = App.GetVariable("AlignWriteField.AutoMarksFailed")
	return(fmarkers)
}

function SetSvars(S,i, st)
{
	GDSpath = S[3][5][i]

	App.Exec("OpenDatabase(" + S[3][5][i] + ")");
	App.Exec("ViewStructure(" + S[4][5][i] + ")");
}

function WriteMatrix(S, i)
{
	N = createArray(S[2][4][i]+1,S[3][4][i]+1,2);
	for (k = 0; k <= S[3][4][i]-1; k++)
	{
		for (j = 0; j <= S[2][4][i]-1; j++)
		{
		N[j+1][k+1][1] = parseFloat((j * S[4][4][i]) + S[6][4][i]);
		N[j+1][k+1][2] = parseFloat((k * S[5][4][i]) + S[7][4][i]);
		}
	}
	return(N)	
}

function AlignWF(markprocedure, logWFflag, i, j, k)
{
	m = j + 1
	n = k + 1
	switch(markprocedure)
	{	//photomarkers
		case 1: amf1 = createArray(3);
				amf1[1] = AutoWFAlign(11);
				Panicbutton();
				if (amf1[1] > 0) 
				{
					amf1[2] = AutoWFAlign(12);
					Panicbutton();
				}
				if (amf1[2] > 0) 
				{
					amf1[3] = AutoWFAlign(13)
				}
				if (logWFflag == 1)
				{
					logfile = App.OpenInifile(Glogfilename[1] + Glogfilename[2]);
					logfile.WriteString("Failed markers S" + i,"Markprocedure", "Photomarkers");
					logstring = "Mark1=" + amf1[1] + ", Mark2 =" + amf1[2] + ", Mark3 =" + amf1[3]
					logfile.WriteString("Failed markers S" + i,"D" + m + ";" + n + " (Photomarkers)", logstring);
				}
				Panicbutton();
				break; 
	   //photo+ebl markers
		case 2: amf1 = createArray(3);
				amf1[1] = AutoWFAlign(11);
				Panicbutton();
				if (amf1[1] > 0) 
				{
					amf1[2] = AutoWFAlign(12);
					Panicbutton();
				}
				if (amf1[2] > 0) 
				{
					amf1[3] = AutoWFAlign(13)
				}
				if (logWFflag == 1)
				{
					logfile = App.OpenInifile(Glogfilename[1] + Glogfilename[2]);
					logfile.WriteString("Failed markers S" + i,"Markprocedure", "Photo + EBL markers");
					logstring = "Mark1=" + amf1[1] + ", Mark2 =" + amf1[2] + ", Mark3 =" + amf1[3]
					logfile.WriteString("Failed markers S" + i,"D" + m + ";" + n + " (Photomarkers)", logstring);
				}
				Panicbutton();
				
				amf2 = createArray(3);
				amf2[1] = AutoWFAlign(21);
				Panicbutton();
				if (amf2[1] > 0) 
				{
					amf2[2] = AutoWFAlign(22);
					Panicbutton();
				}
				if (amf2[2] > 0) 
				{
					amf2[3] = AutoWFAlign(23)
				}
				if (logWFflag == 1)
				{
					logfile = App.OpenInifile(Glogfilename[1] + Glogfilename[2]);
					logfile.WriteString("Failed markers S" + i,"Markprocedure", "Photo + EBL markers");
					logstring = "Mark1=" + amf2[1] + ", Mark2 =" + amf2[2] + ", Mark3 =" + amf2[3]
					logfile.WriteString("Failed markers S" + i,"D" + m + ";" + n + " (EBL markers)", logstring);
				}
				Panicbutton();
				break; 
		//no wfalign evarrr
		case 3: break; 
		// only do a writefield alignment on the very first device
		case 4:
				//new option: 4, for aligning writefield on photo, and then, ebl markers on the first device
				if ((j == 0) && (k == 0)) {
					amf1 = createArray(3);
					amf1[1] = AutoWFAlign(11);
					Panicbutton();
					if (amf1[1] > 0) 
					{
						amf1[2] = AutoWFAlign(12);
						Panicbutton();
					}
					if (amf1[2] > 0) 
					{
						amf1[3] = AutoWFAlign(13)
					}
					if (logWFflag == 1)
					{
						logfile = App.OpenInifile(Glogfilename[1] + Glogfilename[2]);
						logfile.WriteString("Failed markers S" + i,"Markprocedure", "Photo + EBL markers");
						logstring = "Mark1=" + amf1[1] + ", Mark2 =" + amf1[2] + ", Mark3 =" + amf1[3]
						logfile.WriteString("Failed markers S" + i,"D" + m + ";" + n + " (Photomarkers)", logstring);
					}
					Panicbutton();
					
					amf2 = createArray(3);
					amf2[1] = AutoWFAlign(21);
					Panicbutton();
					if (amf2[1] > 0) 
					{
						amf2[2] = AutoWFAlign(22);
						Panicbutton();
					}
					if (amf2[2] > 0) 
					{
						amf2[3] = AutoWFAlign(23)
					}
					if (logWFflag == 1)
					{
						logfile = App.OpenInifile(Glogfilename[1] + Glogfilename[2]);
						logfile.WriteString("Failed markers S" + i,"Markprocedure", "Photo + EBL markers");
						logstring = "Mark1=" + amf2[1] + ", Mark2 =" + amf2[2] + ", Mark3 =" + amf2[3]
						logfile.WriteString("Failed markers S" + i,"D" + m + ";" + n + " (EBL markers)", logstring);
					}
					Panicbutton();
					}
					
				break;
		}
}

function Write(S, i, st, testmode) //S-matrix, n-th chip, type of writing (single,multiple..etc), testmode ornot
{
	N = WriteMatrix(S, i);
	meander = 1;
	for (k = 0; k <= S[3][4][i]-1; k++)
	{
		for (j = 0; j <= S[2][4][i]-1; j++)
		{	
			if (isEven(k) == 0 && meander == 1)
			{
				mj = (S[2][4][i]-1)-j
			}
			else
			{
				mj = j
			}
			
			Panicbutton();
			Stage.GlobalAlignment();
			Stage.DriveUV(N[mj+1][k+1][1], N[mj+1][k+1][2]);
			Stage.LocalAlignment();
			OriginCorrection();
			if (S[12][4][i] != -1) //if the to be exposed layer is not empty
			{
				AlignWF(S[10][4][i], 1, i, mj, k);
				InstallWFAlign(61);
				App.Exec("UnSelectAllExposedLayer()");                      //Deselects al exposed layers
				
				if (testmode == 1) 
				{
					App.Exec("SelectExposedLayer(61)"); 
				}
				else 
				{
					App.Exec("SelectExposedLayer(" + S[12][4][i] + ")");			
				}
				App.Exec("Exposure");
			}
			if (S[1][4][i] != -1) //what does this do? Layer to be written also in global alignment?
			{
				AlignWF(S[10][4][i], 1, i, j, k); //align a writefield or not depending on S[10][4][i]
				
				App.Exec("UnSelectAllExposedLayer()");                      //Deselects al exposed layers
				App.Exec("SelectExposedLayer(" + S[1][4][i] + ")");
				if (testmode != 1) App.Exec("Exposure");
			}		
		}
	}
	Stage.GlobalAlignment();
}

function FirstWFAlign()
{
    markprocedure = parseInt(App.InputMsg("Select type of marker", "Select 1 if you have Photo-markers, 2 if you have EBL markers", "1"));
	AlignWF(markprocedure, 0);
}

function Start()
{
	Stage.GlobalAlignment();
    
	//Column.SetWriteField(100, true); 	
	
	if (App.Errmsg(EC_YESNO, 0 , "Do WF alignment only?") == EA_YES)
	{
	   FirstWFAlign()
	   Abort();
	}

	var as = App.InputMsg("Select alignment source","Select '1' to collect sample data or select '2' to read 'Multisample.txt'.", "1")
	if (as!=1 && as!=2) Abort();  
	
	if (as == 1)
	{
		st = App.InputMsg("Choose between single, multiple or multiple/advanced sample types/properties.","Select 1 for single, 2 for multiple, 3 for single + advanced, 4 for multiple + advanced settings.", "1");
		if (st!=1 && st!=2 && st!=3 && st!=4) Abort();  
		S = CollectSD(st);
	}	
	else
	{
		Gnums = Detectnums();
		S = Load();
	}
	Gnums = S[11][4][1]
	Glogfilename = Logdata(S, st);
	MeasBeamCurrent();
	StepsizeDwelltime();
	beamoffflag = 0;                                                     
	if (App.Errmsg(EC_YESNO, 0 , "Run in test mode? (No exposure)") == EA_YES)
	{
		testmode = 1
		//if (App.Errmsg(EC_YESNO, 0 , "Overwrite Multisample.txt with logfile for easy loading of paramters?") == EA_YES)
		//{
		//	App.ErrMsg(0,0,"Function not yet implemented")
		//}
	}
	else
	{
		if (App.Errmsg(EC_YESNO, 0 , "Turn off EHT after writing?") == EA_YES) beamoffflag = 1;
		testmode = 0
	}
	
	
	App.ErrMsg(0,0,"Writing now commences.");
	for (i = 1; i<= Gnums; i++)
	{
		Panicbutton();
		AlignUV(S, i, st);
		SetSvars(S, i, st);
		
		//todo: make option for alignment on first device of new chip
		Write(S, i, st, testmode);
    }
    if (beamoffflag == 1)                                                //5 lines: Turn off beam if option has been set.
    {
		Column.HTOnOff = false;
		App.ProtocolEvent(30, 0, 0, "Beam shutdown.");
    }
}

var Gsn = "Multisample";
var Gsnl = parseInt(Gsn.length);
var Gfilepath = ExpandPath("%userroot%\Script\\" + Gsn + "\\");
var Glogfilename = createArray(3);
Glogfilename[1] = Gfilepath + "\\Logs\\";
var Glib = Gfilepath + "\\Lib\\";
var Gsampleini = App.OpenInifile(Gfilepath + "Multisample.txt");
var S = createArray(1,1,1);
var Gnums = -1;

function Crap()
{
var path = App.GetVariable("Variables.File") + "\\";
var path = path.substring(0, path.length-(Gsnl+4));
path = "C:\\RAITH150-TWO\\User\\Administrator\\Script\\Multisample\\"
App.Errmsg(0,0,path + Gfilepath)
if (path != Gfilepath)
{
	Install(Gsn, Gsnl, Gfilepath, path);
	App.ErrMsg(0,0,"Script installed, please restart RAITH software.");
	//Abort();
}
else
{
	if (App.ErrMsg(EC_YESNO, 0, "Do you want to reinstall the script?") == EA_YES) 
	{
		Install(Gsn, Gsnl, Gfilepath, path);
		App.ErrMsg(0,0,"Script successfully reinstalled.");
	}
}
}

Install(0);
ResetPanicbutton();
Start();
Succes(beamoffflag);