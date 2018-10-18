//-------------------------------------------------------------------
//    SCRIPT NAME:      Multisample
//    Internal version: 0.99
//    AUTHOR:           Joost Ridderbos
// 	  Git hashkey: 		"value"
//    Copyright 2013-2016 Joost Ridderbos
//-------------------------------------------------------------------

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
 
// Future plans (- = open, V = fixed, T = needs testing):
// - Add WF min/max to markers
// T Add option to change working area per sample
// - Build in 'back' functionality
// - Add comments :)
// - Add initialisation to check if all files are present
// T Add ability to do only a GDSII scan on the first device on a sample (one UV alignment)
// - Add ability to load writematrix from file (for unevenly spaced devices on a sample)
// 		-> Combine this with loading different designs/layers per UV alignment
// V Add procedure for manual alignment per chip --> Grab UV/WF 
// - Add no-GUI mode for using patterning in Plist
// - Put Markers/procedures etc (user editable files) in a separate folder
// 	- > Add separate procedure for manual alignment on images.
// - Expand on alignprocedures syntax
// - Redo sampledefinitions in multisample/sdvars. Make them not rely on numbers but use loadlist maybe.
// V Check if GDS Markertype is valid

// BUGS:
// - Fixed, needs a test: Manual BC measurement in script does not work, double menu + value is not recorded.
// - Fixed, needs a test: Sergey: Bug report: sd vars works strange with use preseted beam current? - > no - > measure current - >  no
// - Improssibru: Manual alignment on dot within script not possible
// 		-> Needs added routine during UV alignment. <- if possible :/
// - Stepsize bug? 2nd sample has 1 mm/sec lower beamspeed allowance, at least stepsize is higher. Test this.

// Feature requests:
// - nothing atm

var Gsn = "Multisample";
var Gsharedfolder = "\\\\130.89.7.17\\nanolab\\mesalabuser\\NE\\EBLLogs";
//var Gsnl = parseInt(Gsn.length, 8);
var Gfilepath = ExpandPath("%userroot%\Script\\" + Gsn + "\\");
var Glogfilename = createArray(3);
Glogfilename[1] = Gfilepath + "Logs\\";
var Gdatesp = GetLogDate();
Glogfilename[2] = Gdatesp + " " + App.GetVariable("Variables.LastUser") + " Log.txt";
var Gprogressfilename = [];
Gprogressfilename = Gdatesp + " " +  App.GetVariable("Variables.LastUser") + " Progress.txt";
var Glib = Gfilepath + "\\Lib\\";
var Gsampleini = App.OpenInifile(Gfilepath + "Multisample.txt");
var GSDini = App.OpenInifile(Gfilepath + "SDvars.txt");
var GUVini = App.OpenInifile(Gfilepath + "UVvars.txt");
var GMarkertypes = App.Openinifile(Gfilepath + "Markers.txt");
var GGDSIImarkertypes = App.Openinifile(Gfilepath + "L61markers.txt");
var GAlignprocedures = App.Openinifile(Gfilepath + "Alignprocedures.txt");
var S = createArray(1,1,1);
var Gnums = -1;
var Gmeasbcflag = 1;
var i, st, beamoffflag, collectinguvflag;

function Succes()			                                            //-- Called if function 'write' was successful
{
   	Install(1);
   	Stage.JoystickEnabled = true;                                        //Turns joystick back on
   	App.SetFloatVariable("AlignWriteField.AutoMarksFailed", 0);          //Resets failed automarks counter
   	App.SetVariable("Adjust.MinAutoMarks","3");                          //Resets MinAutoMarks back to 3 (from 2)
   	App.SetVariable("Exposure.ExposureLoops","1"); 						//Let's be nice to the default settings 
	Stage.WaitPositionReached();
  	App.ErrMsg(EC_INFO, 0, "Great Succes!");                             //Displays success message ;) (as long as you don't correct the spelling in the message)
}

function isEven(n)														//Function to check if number is odd or even
{
	if (parseInt(n, 8)%2 !==0)
	{
		n = 0;
	}
	else
	{
		n = 1;
	}
	return n;
}

function ReplaceAtbymu(str)
{
	str = str.replace(/@/g, "\u00B5");
	return str;
}

function PreciseRound(num, decimals) 
{
	var t=Math.pow(10, decimals);   
 	return (Math.round((num * t) + (decimals)*((10 / Math.pow(100, decimals)))) / t).toFixed(decimals);
}

function Progress(sample, nx, ny)
{
	var totalstructures, currentstructurepercent, structureonsample, currentstructure, totalstructuresonsample, o, p;
	totalstructures = 0;
	currentstructure = 0;
	for (o = 1; o <= S[11][4][1]; o++)  //Loop calculating total amount of structures
	{
		totalstructures = totalstructures + (parseInt(S[2][4][o]) * parseInt(S[3][4][o]));
	}
	for (p = 1; p <= sample-1; p++) 	//Loop determining structure 
	{
		currentstructure = currentstructure + (parseInt(S[2][4][p]) * parseInt(S[3][4][p]));
	//	currentstructure = currentstructure + (parseInt(S[2][4][s])-(n+1))*(m+1) hier klopt nog geen zak van
	}
	currentstructure = currentstructure + (ny)*(parseInt(S[2][4][sample])) + (nx+1);
	currentstructurepercent = currentstructure/totalstructures;
	structureonsample = (ny)*(parseInt(S[2][4][sample])) + (nx+1);
	totalstructuresonsample = parseInt(S[2][4][sample]) * parseInt(S[3][4][sample]);
	return [currentstructurepercent, currentstructure, totalstructures, structureonsample, totalstructuresonsample];
}

function GetLogDate()
{
    var month, day, hours, minutes, seconds, s, d; 
    d = new Date();
    month = d.getMonth() + 1;
    day = d.getDate();
    hours = d.getHours();
    minutes = d.getMinutes();
    seconds = d.getSeconds();

    if ((month) < 10) month = "0" + month;  
    if (day < 10) day = "0" + day;
   	if (hours < 10) hours = "0" + hours;
   	if (minutes < 10) minutes = "0" + minutes;
    if (seconds < 10) seconds = "0" + seconds;
   	
   	s = d.getYear() + "";
   	s += month + "";
   	s += day + " ";
   	s += hours + "";
   	s += minutes + "";
   	s += seconds + "";
   	return(s);	
}

function Progbarstring(percentage, length)
{
	var progbarlength, bars, barstring, q, tellert;
	progbarlength = length;
	bars = Math.round(percentage*progbarlength);
	barstring = "[";
	for (q = 0; q < bars; q++)
	{
  		barstring += "*";

 	}
 	for (tellert = bars; tellert < progbarlength; tellert++)
	{
  		barstring += " ";
	}
	barstring += "]";
	return(barstring);
}

function TimeandProgress(sample, nydir, meanderxdir, nxdir, starttime, currentsampletime, beforepattswitch)
{
	var prog, elapsedtime, sampletimeint, timetogo, endtime, finishtime, progresslogfile, actualfinishtime;
	var helapsedtime, hsampletimeint, htimetogo, sampleendtime;
	var barstring;
	var locstarttime = [];
	var locsamplestarttime = [];
	var locfinishtime = [];
	var locactualfinishtime = [];
	prog = Progress(sample, nxdir, nydir);
	locstarttime[0] = new Date(starttime).toLocaleDateString();
	locstarttime[1] = new Date(starttime).toLocaleTimeString();
	locsamplestarttime[0] = new Date(currentsampletime).toLocaleDateString();
	locsamplestarttime[1] = new Date(currentsampletime).toLocaleTimeString();
	//Code for logging data
	barstring = Progbarstring(prog[0], 20);
	progresslogfile = App.OpenInifile(Glogfilename[1] + Gprogressfilename);
	progresslogfile.Writestring("Total progress", "Starting time ", " " + locstarttime[1] + " on " + locstarttime[0]);
	progresslogfile.Writestring("Now patterning", "Sample ", " " + sample + " (" + S[8][4][i] + ")");
	progresslogfile.Writestring("Now patterning", "Structure ", " " + "nx/ny[" + parseInt(nxdir + 1) + ";" + parseInt(meanderxdir + 1) + "]");
	progresslogfile.Writestring("Now patterning", "Patterning started ", " " + locsamplestarttime[1]);	

	if (beforepattswitch == 0)
	{
		sampleendtime = TimestampUTC();
		elapsedtime = sampleendtime - starttime;
		timetogo = elapsedtime/prog[0] - elapsedtime;
		endtime = starttime + timetogo;
		finishtime = starttime + elapsedtime + timetogo;

		helapsedtime = mstoHours(elapsedtime);
		htimetogo = mstoHours(timetogo);

		sampletimeint = sampleendtime - currentsampletime;
		hsampletimeint = mstoHours(sampletimeint);

		locfinishtime[0] = new Date(finishtime).toLocaleDateString();
		locfinishtime[1] = new Date(finishtime).toLocaleTimeString();

		progresslogfile.Writestring("Total progress", "Grand total", barstring + " (" +  prog[0]*100 + "%), total of structures " + prog[1] + "/" + prog[2]);
		
		progresslogfile.Writestring("Total progress", "Last Structure ", " " + prog[3] + " (of " + prog[4] + ")");
		progresslogfile.Writestring("Total progress", "Of sample ", " " + sample +" (of " + Gnums + ")");
		progresslogfile.Writestring("Total progress", "Starting time ", " " + locstarttime[1] + " on " + locstarttime[0]);
		progresslogfile.Writestring("Total progress", "Elapsed time ", " " + helapsedtime[0]);
		progresslogfile.Writestring("Total progress", "Remaining time (estimate) ", " " + htimetogo[0]);
		progresslogfile.Writestring("Total progress", "ETA (estimate) ", " " + locfinishtime[1] + " on " + locfinishtime[0]);
		progresslogfile.Writestring("Timelog Sample " + sample + " (" + S[8][4][i] + ")", "Structure nx/ny[" + parseInt(nxdir + 1) + ";" + parseInt(nydir + 1) + "] ", " Duration: " + hsampletimeint[0]+ ", Start: " + locsamplestarttime[1] );

		if (prog[0] == 1)
		{	
			actualfinishtime = TimestampUTC();
			locactualfinishtime[0] = new Date(actualfinishtime).toLocaleDateString();
			locactualfinishtime[1] = new Date(actualfinishtime).toLocaleTimeString();
			progresslogfile.Writestring("Total progress", "Job Finished", " " + locactualfinishtime[1] + " on " + locactualfinishtime[0]);
		}
	}
}

function mstoHours(ms)
{
	var str, hours, minutes, seconds;
	hours = Math.floor(ms/1000/3600);
	if (hours < 10) hours = "0" + hours;
	minutes = Math.floor((ms - (hours*1000*3600))/1000/60);
	if (minutes < 10) minutes = "0" + minutes;
	seconds = Math.floor((ms - (hours*1000*3600)-(minutes*1000*60))/1000);
	if (seconds < 10) seconds = "0" + seconds;
	str = hours + ":" + minutes + ":" + seconds;
	return([str, hours,minutes,seconds]);
}

function TimestampUTC()
{
	var d, ms;
	d = new Date();
	ms = d.getTime();
	return(ms);
}

function GenerateBatchFile()
{
    var bline1, bline2, file;
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    if (FileExists(Gfilepath + "Lib\\CopyLog.bat") == 1)
    {
    	file = fso.GetFile(Gfilepath + "Lib\\CopyLog.bat");
    	file.Delete();
    }
	// Create the file, and obtain a file object for the file.
	var filename = Gfilepath + "Lib\\CopyLog.bat";
	//fso.CreateTextFile(Gfilepath + "Lib\\CopyLog.bat");
	fso.CreateTextFile(filename);
	file = fso.GetFile(filename);

	// Open a text stream for output.
	var ts = file.OpenAsTextStream(2, -2);

	// Write to the text stream.
	bline1 = "xcopy \"" + Glogfilename[1] + Glogfilename[2] + "\"" + " " + "\"" + Gsharedfolder + "\"" + " /y";
	bline2 = "xcopy \"" + Glogfilename[1] + Gprogressfilename + "\"" + " " + "\"" + Gsharedfolder + "\"" + " /y";
	ts.WriteLine(bline1);
	ts.WriteLine(bline2);
	ts.Close();
}

function ExecFile(file)
{
    WshShell = new ActiveXObject("WScript.Shell");
    WshShell.Run("cmd /c" + " \"" + file + "\"");
}

function CopyLog()
{
    ExecFile(Gfilepath + "Lib\\CopyLog.bat");
}

function ReadLsc(filename)
{
  	var lines, string, ts, file, j, c, d;
	var fso = new ActiveXObject("Scripting.FileSystemObject");
  	var lsc = new Array();
   	var linesused = new Array();
	file = fso.GetFile(filename);
	ts = file.OpenAsTextStream(1, 0);
 	string = ts.ReadAll();
 	lines = string.split(/\r\n|\r|\n/);
	  for (j=1; j <= lines.length-1; j++)
  	{
    	if (lines[j] == "[DATA]") break;
    }
	for (c=j + 1; c <= lines.length-1; c++)
  	{
    	linesused[c-j-1] = lines[c];
  	}
  	for (d=0; d <= linesused.length-1; d++)
  	{
  		lsc[d] = linesused[d].split(",");
  	}
  	ts.Close();
  	return lsc;
}

function GetActiveWorkingArea(gdsfile, structure)
{
	var workingareafile, workingareaini, activewa, activewastring, workingarea;
	workingareafile = gdsfile.substring(0,gdsfile.length-3)+"wor";
	workingareaini = App.OpenInifile(workingareafile);
	activewa = workingareaini.ReadString(structure, "ActiveWA", "");
	activewastring = "WorkingArea" + activewa;
	workingareastring = workingareaini.ReadString(structure,activewastring,"");
	workingarea = workingareastring.split(",");
	wa = workingarea[0] + ","+ workingarea[1] + "," + workingarea[2] + ","+ workingarea[3];
	return wa;
}



function GetColDatasetList()
{


	// var colatts = new Array();
	// var coldatasetlist = new Array();
	// var coldataset = createArray(999,4);
	// var colfolder = createArray(999,4);
	// var colstring;
 //  var coldatfile;
	// var entrycolset = 0;
	// var entrycolfolder = 0;
	// coldatfilepath = Glib + "ColumnDataSets.txt";
	// var fso = new ActiveXObject("Scripting.FileSystemObject");

	// if (FileExists(coldatfilepath) == 1)
 //    {
 //    	coldatfile = fso.GetFile(coldatfilepath);
 //    	coldatfile.Delete();
 //    }

	// // Create the file, and obtain a file object for the file.
	// var filename = coldatfilepath;
	// fso.CreateTextFile(filename);
	// coldatfile = fso.GetFile(filename);
	// var cdf = coldatfile.OpenAsTextStream(2, -2);

	// for (c_c=0; c_c<999; c_c++)
	// {
 //    	colstring = "ColEBeam/" + c_c;
 //    	attribute = ["DSD_Name", "DSD_GroupID", "DSD_ID"];
 //    	colatts[0] = App.GetVariable(colstring + "." + attribute[0]);
 //    	colatts[1] = App.GetVariable(colstring + "." + attribute[1]);
 //    	colatts[2] = App.GetVariable(colstring + "." + attribute[2]);

 //    	if (colatts[1].length != 0 && colatts[1] != -1)
 //    	{
 //        	coldataset[entrycolset][0] = colatts[0];
 //        	coldataset[entrycolset][1] = colatts[1];
 //        	coldataset[entrycolset][2] = colatts[2];
 //        	coldataset[entrycolset][3] = c_c;
 //        	entrycolset = entrycolset + 1; 
 //    	}
 //    	if (colatts[1].length != 0 && colatts[1] == -1)
 //    	{
 //        	colfolder[entrycolfolder][0] = colatts[0];
 //        	colfolder[entrycolfolder][1] = colatts[1];
 //        	colfolder[entrycolfolder][2] = colatts[2];
 //        	colfolder[entrycolfolder][3] = c_c;
 //        	entrycolfolder = entrycolfolder + 1; 
 //    	}         
	// }
	// for (d_c=0; d_c<entrycolset; d_c++)
	// {
	//     for (e_c=0; e_c<entrycolfolder+1; e_c++)
	//     {
 //        	if (coldataset[d_c][1] == colfolder[e_c][2])
 //        	{
 //           		charding = coldataset[d_c][0].substring(0,1);
 //           		if (coldataset[d_c][0].substring(0,1) == "/")
 //           		{
 //              		coldataset[d_c][0] = coldataset[d_c][0].substring(2,coldataset[d_c][0].length); 
 //           		}
 //           		coldatasetlist[d_c] = colfolder[e_c][0] + ": " + coldataset[d_c][0];
 //           	cdf.WriteLine(coldatasetlist[d_c]);
 //        	}
 //    	}
	// }
	// cdf.Close();
return coldatasetlist;
}

function CheckColumnExists(colset)
{
 	coldatasetlist = GetColDatasetList();
 	var exists = -1;
 	for (f_c=0; f_c<coldatasetlist.length; f_c++)
 	{
     	if (colset == coldatasetlist[f_c])
     	{
     		exists = 1;
     		break;
     	}
 	}
	return exists; 
}

function LastDatasettoColset()
{
	var dataset, splitdataset, splitdataset2, partonecolset, parttwocolset, colset;

	dataset = (App.GetSysVariable("Vicol.LastDataset"));
	if (dataset.length != 0)
	{
		splitdataset = dataset.split("(");
		splitdataset2 = splitdataset[1].substring(0, splitdataset[1].length - 1);
		partonecolset = splitdataset2;
		parttwocolset = splitdataset[0].substring(0, splitdataset[0].length - 1);
		colset = partonecolset + ": " + parttwocolset;
		colset = ReplaceAtbymu(colset);
	}
	else
	{
		colset = "";
	}
	return colset;
}

function MeasBeamCurrent()	//Not available on elphy											//Measures beam current
{
	// var bc, bcf, bcfdisp, retval, manmeasswitch;
	// manmeasswitch = 0;
	// bc = createArray(3);
	// if (App.ErrMsg(EC_YESNO, 0, "Do you want to perform an automated beam current measurement?") == EA_YES)                        //Asks user to perform beam current measurement + dwelltime corrections
 //    {
 //    	if ( Column.CheckConnection() )                                   //If answer is YES, measurement is performed
 //      	{
	// 		Stage.X = -35; 													//Sets stage coörds to 30,30 (saves time when driving back)
	// 	 	Stage.Y = 39; 
	// 	 	Stage.WaitPositionReached(); 
	// 	 	BeamCurrent(false, false);
	// 	 	bc[0] = parseFloat(App.GetVariable("BeamCurrent.BeamCurrent"));
	// 	 	Stage.WaitPositionReached();
 //         	BeamCurrent(false, false);
 //         	bc[1] = parseFloat(App.GetVariable("BeamCurrent.BeamCurrent"));
 //         	Stage.WaitPositionReached();
 //         	BeamCurrent(false, false);
 //         	bc[2] = parseFloat(App.GetVariable("BeamCurrent.BeamCurrent"));
 //         	bcf = ((bc[0]+bc[1]+bc[2])/3);
 //         	if	(Math.max(bc[0], bc[1], bc[2])/Math.min(bc[0], bc[1], bc[2]) >= 1.01)
 //         	{
 //         	    retval = App.ErrMsg(9,0,"Beam current fluctuation over three measurements(>1%) (" + bc + " nA). Pause script for manual measurement?");
 //         	    if (retval == 6)
 //         	    {
 //         	    	App.Exec("Halt()");
 //         	    	bcf = App.GetVariable("BeamCurrent.BeamCurrent");
 //         	    	manmeasswitch = 1;
 //         	    }
 //         	    if (retval == 2)
 //         		{
 //         			Abort();
 //         		}
 //         	}	        	
 //        	if (manmeasswitch == 0)
 //        	{
 //        		if (App.ErrMsg(4,0,"Beamcurrent: " + bcf + "pA. Continue? 'No' pauzes script for manual measurement.")==7) 
 //        		{
	//         		App.Exec("Halt()");
	//         		bcf = App.GetVariable("BeamCurrent.BeamCurrent");
 //         	    	manmeasswitch = 1;
 //    	    	}
 //    	    }
 //        	bcf = bcf.toString();
 //        	//bcfdisp = PreciseRound(bcf*Math.pow(10,3),2); //Dit moest van Joren. Hij houdt niet van teveel floating.
 //        	App.SetVariable("BeamCurrent.BeamCurrent", bcf);
 //        }
 //    }
 	App.InputMsg("Enter beamcurrent in nA for currently activated aperture/voltage", 0, 0).toString();
 	App.SetVariable("BeamCurrent.BeamCurrent", bcf);
}

function SetStepsizeDwelltime(i)
{
   	var stepsizeline_um, stepsize_um, stepsizec_um, beamcurrent;

   	stepsizeline_um = (S[1][6][i]*Math.pow(10,-3));
   	stepsize_um = (S[2][6][i]*Math.pow(10,-3));
   	stepsizec_um = (S[3][6][i]*Math.pow(10,-3));
   	beamcurrent = S[7][6][i];
	App.SetVariable("BeamCurrent.BeamCurrent", beamcurrent);
	App.SetVariable("Variables.MetricStepSize", stepsize_um.toString());               //Sets area stepsize y-direction to defined area stepsize
    App.SetVariable("Variables.MetricLineSpacing", stepsize_um.toString());            //Sets area stepsize x-direction to defined area stepsize
    App.SetVariable("BeamControl.CurveStepSize", stepsizec_um.toString());              //Sets curved element stepsize to defined area stepsize
    App.SetVariable("BeamControl.CurveLineSpacing", stepsizec_um.toString());           //Sets curved line stepsize to defined area stepsize
    App.SetVariable("BeamControl.SplStepSize", stepsizeline_um.toString());            //Sets line stepsize to defined area stepsize
    App.Exec("SetExposureParameter()");                                  //Actually activates the previous defined settings
    App.Exec("CorrectCurvedElementsDwellTime()");                        //Corrects curved elements dwelltimes
    App.Exec("CorrectDotDwelltime()");                                   //Corrects dot dwelltimes
    App.Exec("CorrectSPLDwelltime()");                                   //Corrects line dwelltimes
	App.Exec("CorrectDwelltime()");                                           //Corrects area dwelltimes
}

function StepsizeDwelltime(i,GUIflag, bcreadflag) //GUIflag = 0 means only beamspeeds are calculated and modified. BC and SS are not touched.
{
    var msg_setareastepsize, msg_rounding, msg_setlinestepsize, msg_higherthan, beamspeed, minstepsize, advisedbeamspeed, areaminstepsize, stepsize, stepsizec, stepsizeline, criticalbeamspeed, bflag, beamcurrent, stepsizecurve;
    msg_setareastepsize = "Set AREA stepsize for patterning in nm";
	msg_rounding = "Will be rounded up to a multiple of ";
	msg_setlinestepsize = "Set LINE stepsize in nm";
	msg_higherthan = "nm: (recommended higher than ";
	
	var nLoops = S[14][4][i];
	var curvedose = 150;
	var dotdose = 0.01;
	var resistsensitivity = 150;
	var linedose = 500;
	
	curvedose = curvedose / nLoops;
	dotdose = dotdose / nLoops;
	resistsensitivity = resistsensitivity / nLoops;
	linedose = linedose / nLoops;

	App.SetVariable("Exposure.CurveDose", curvedose+""); 
	App.SetVariable("Exposure.DotDose",dotdose+"") ;
	App.SetVariable("Exposure.ResistSensitivity",resistsensitivity+"");
	App.SetVariable("Exposure.LineDose",linedose+"");
	App.SetVariable("Exposure.ExposureLoops",nLoops+"");

	if (bcreadflag == 1) 
	{
		beamcurrent = App.GetVariable("BeamCurrent.BeamCurrent"); 			//Beamcurrent [nA]
	}
	else 
	{
		beamcurrent = S[7][6][i];
	}

	minstepsize = App.GetVariable("Beamcontrol.MetricBasicStepSize")*Math.pow(10,3); //Min stepsize in [nm]
	advisedbeamspeed = 11*Math.pow(beamcurrent,0.5)+7;       //Sets the advised beamspeed in [mm/s]
    areaminstepsize = Math.ceil(beamcurrent/((advisedbeamspeed*Math.pow(10,-5)*App.GetVariable("Exposure.ResistSensitivity")*minstepsize)))*minstepsize; //Calculates advised beamspeed [nm]
	if (GUIflag == 0)
	{
		stepsize = S[2][6][i];
		stepsizeline = S[1][6][i];
		stepsizecurve = S[3][6][i];
	}

	if (GUIflag == 1)
	{
		stepsize = areaminstepsize;
		stepsizeline = minstepsize;
		stepsizecurve = areaminstepsize;
	}

	if (GUIflag == 2)
	{
		stepsize = App.InputMsg(msg_setareastepsize, msg_rounding + minstepsize + msg_higherthan + areaminstepsize + "nm)", areaminstepsize).toString(); //Asks user to set stepsize for patterning
    
    	if (stepsize < minstepsize) stepsize=minstepsize; //If the user set stepsize is smaller than the minimum stepsize, it is return to this minimum value
    	stepsizeline=(minstepsize*Math.ceil(App.InputMsg(msg_setlinestepsize, msg_rounding + minstepsize + "nm:", minstepsize)/(minstepsize))).toString(); //Asks user to set stepsize for patterning
    	if (stepsizeline < minstepsize) stepsizeline = minstepsize; 		//If the user set stepsize is smaller than the minimum stepsize, it is returned to this minimum value
    	stepsizecurve = stepsize;   	        
	}
	                                                                     
	beamspeed = [];
	beamspeed[0] = beamcurrent*Math.pow(10,4)/(App.GetVariable("Exposure.LineDose"));  //Calculates line beamspeed in mm/s
  	beamspeed[1] = beamcurrent*Math.pow(10,5)/(stepsize*App.GetVariable("Exposure.ResistSensitivity")); //Calculates area beamspeed in mm/s                                                                        //Lines below calculate the resulting beam speed based on user stepsize
	beamspeed[2] = beamcurrent*Math.pow(10,5)/(stepsizecurve*App.GetVariable("Exposure.CurveDose")); //Calculates area beamspeed in mm/s 

   	

   	if (GUIflag == 2)
   	{
   	 	criticalbeamspeed = advisedbeamspeed;
   		bflag = 0;
   		
   		if (beamspeed[0] > criticalbeamspeed) 
      	{
      		App.Errmsg(EC_INFO ,0 , "WARNING! Line beam speed greater than 10mm/s:    " + Math.ceil(beamspeed[2]*10)/10 + "mm/s."); 
      		bflag = 1;
      	}      	
   		if (beamspeed[1] > criticalbeamspeed) 
      	{
      		App.Errmsg(EC_INFO ,0 , "WARNING! Area beam speed greater than "+ advisedbeamspeed +" mm/s:    " + Math.ceil(beamspeed[1]*10)/10 + "mm/s.");
      		bflag = 1;
      	}
      	//if (beamspeed[2] > critica3	lbeamspeed)                                            //Next lines checks if the calculated beamspeed is not higher than 10 mm/s, else it gives a warning.
      	//{ 
      	//	App.Errmsg(EC_INFO ,0 , "WARNING! Curved Area beam speed greater than 10mm/s: " + beamspeed[0]*1000 + "mm/s, increase stepsize or reduce beamcurrent.");
      	//	bflag = 1;
      	//}

   		if (bflag == 1)                                                      //If one of the beamspeeds was too high, the user is asked if they want to continue anyway.
    	{
	      	if (App.ErrMsg(EC_YESNO, 0, "Continue with high beamspeed?" ) == EA_NO) Abort();
	    }
   			bflag = 0; 
   	}
   	stepsizec = stepsize;

   	if (GUIflag != 0)
   	{
   		S[1][6][i] = stepsizeline;
   		S[2][6][i] = stepsize;
   		S[3][6][i] = stepsizec;
   	}
   	
   	S[4][6][i] = PreciseRound(beamspeed[0],3);
   	S[5][6][i] = PreciseRound(beamspeed[1],3);
   	S[6][6][i] = PreciseRound(beamspeed[2],3);
   	S[7][6][i] = PreciseRound(beamcurrent,6);
   	//App.ErrMsg(0,0,"1 - szl:"+S[1][6][i] +stepsizeline+" /sz:"+S[2][6][i]+" /szc:"+S[3][6][i]+" /bsl:"+S[4][6][i]+" /bsa:"+S[5][6][i]+" /bsc:"+S[6][6][i]+" /bc:"+S[7][6][i])
}


function SearchArray(array,string)
{
	var n;
	for (n = 0; n < array.length; n++)
	{
		if (array[n] == string)
		{
			return n;
		}
	}
	return -1;
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
   App.SetVariable("Exposure.ExposureLoops","1"); 						//Let's be nice to the default settings
   if (collectinguvflag == 1)
   {
   		Logdata();
   }
   throw new Error('Execution cancelled by user');                      //Interrupts script by trowing error
}

function Detectnums(file, filename, checkflag)
{
	var Gnums2, i, it;
	
	Gnums2 = file.ReadString("GS", "n-Samples", -1);

	if (checkflag == 1)
	{
		for (i = 1; i <= 99; i++)
		{
			it = "S" + i;
			if (file.SectionExists(it)==false )
			{
			Gnums = parseInt(i - 1);
			
			if (Gnums != Gnums2)
				{
					App.ErrMsg(0, 0, "Inconsistency in " + filename + ". Check n-Samples under [GS] and check sample entries.");
					Abort();
				}
			else if	(App.ErrMsg(4, 0, Gnums + " samples are detected. Is this correct?")==7)
				{
					App.ErrMsg(0, 0, "Please do all kinds of stuff to make things not wrong.");
					Abort();
				}
        	return(Gnums);
        	}
		}

	}
	else
	{
		Gnums = Gnums2;
	}
	return Gnums;
}

function ResetPanicbutton()
{
	var panicini;
	
	panicini = App.OpenInifile(Gfilepath + "Panic.txt");
	parseInt(panicini.WriteInteger("Panicswitch","panic",0));
}

function Panicbutton()
{
	var panicini, panicswitch;
	panicini = App.OpenInifile(Gfilepath + "Panic.txt");
	panicswitch = parseInt(panicini.ReadInteger("Panicswitch","panic",0));
	if (panicswitch !== 0)
	{
		App.ErrMsg(0,0,"Panic button initiated. Script execution terminated.");
		Abort();
	}
}

function createArray(length) 
{
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) 
    {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
	}

    return arr;
}

function CheckPathLength(str, sn)
{
	if (str.length>100)
	{
		App.ErrMsg(0,0,"GDSII datapath for sample " + sn + " is too long (100 characters is max, this path is " + str.length + " characters long), change location or pathnames. The script will abort.");
		Abort();
	}
}

function Load(SDflag)
{	   
    S = createArray(99,7,Gnums+1);
    var inifile, st, it, j, colmode, GDSIIpath, checklist, GDSmarkstring, GDSmarklist, GDSarray, cce;

	//First load the list of parameters applicable to all loaded samples:
	if (SDflag == 0) 
	{
		inifile = Gsampleini;
	}
	if (SDflag == 1) 
	{
		inifile = GSDini;
	}
	
	S[9][4][1] = inifile.ReadInteger("GS","Procedure", -9999);
	if (S[9][4][1] != 1 && S[9][4][1] != 2)
	{
		App.ErrMsg(0,0,"'Procedure' could not be read, check Multisample/SDvars.txt" + S[9][4][1]);
		Abort();
	}
	st = S[9][4][1];
	S[11][4][1] = inifile.ReadFloat("GS","n-Samples", -9999);
	if (S[11][4][1] == -9999)
	{
		App.ErrMsg(0,0,"'n-samples' could not be read, check Multisample/SDvars.txt");
		Abort();
	}
	S[15][4][1] = inifile.ReadString("GS", "User", ""); 
	
    for (i = 1; i <= Gnums; i++)
    {
		it = "S" + i; 
		
	    if (SDflag == 0)
	    {
	    	for (j=1; j <= 3; j++)
			{
				S[1][j][i] = inifile.ReadFloat(it, "U" + j, -9999);
				S[2][j][i] = inifile.ReadFloat(it, "V" + j, -9999);
				S[3][j][i] = inifile.ReadFloat(it, "WD" + j, -9999);
				S[4][j][i] = inifile.ReadFloat(it, "X" + j, -9999);
				S[5][j][i] = inifile.ReadFloat(it, "Y" + j, -9999);
				S[6][j][i] = inifile.ReadFloat(it, "Z" + j, -9999);
				S[7][j][i] = inifile.ReadFloat(it, "MarkValid" + j, -9999);
				for (cnt=1; cnt <= 7; cnt++)
				{
					//App.ErrMsg(0,0,S[cnt][j][i] + "__"+cnt)
					checklist = ["U","V","WD","X","Y","Z","MarkValid"];
					if (typeof(S[cnt][j][i]) != "number" || S[cnt][j][i] == -9999)
					{
						App.ErrMsg(0,0,"Error in sample " + i + " marker " + j + ", value '" + checklist[cnt-1] + "', check Multisample.txt"+S[cnt][j][i]);
						//Abort();
					}
				}
			}

			S[5][5][i] = inifile.ReadFloat(it, "WFZoomU", -9999);
			S[6][5][i] = inifile.ReadFloat(it, "WFZoomV", -9999);
			S[7][5][i] = inifile.ReadFloat(it, "WFShiftU", -9999);
			S[8][5][i] = inifile.ReadFloat(it, "WFShiftV", -9999);
			S[9][5][i] = inifile.ReadFloat(it, "WFRotU", -9999);
			S[10][5][i] = inifile.ReadFloat(it, "WFRotV", -9999);
			for (cnt=5; cnt <= 10; cnt++)
			{
				checklist = ["WFZoomU","WFZoomV","WFShiftU","WFShiftV","WFRotU","WFRotV"];
				if (typeof(S[cnt][5][i]) != "number" || S[cnt][5][i] == -9999)
				{
					App.ErrMsg(0,0,"Error in sample " + i + ", value '" + checklist[cnt-1] + "', check Multisample.txt");
					Abort();
				}
			}
		}

		if (st == 1)
		{
			S[1][4][i] = (inifile.ReadString("GS","ExpLayers", "err"));
			if (S[1][4][i] == "err")
			{
				App.ErrMsg(0,0,"Error in 'GS', value 'ExpLayers', check Multisample.txt/SDVars.txt");
				Abort();
			}
			S[2][4][i] = inifile.ReadInteger("GS", "Nx", -9999);
			S[3][4][i] = inifile.ReadInteger("GS", "Ny", -9999);
			S[4][4][i] = inifile.ReadFloat("GS", "Sx", -9999);
			S[5][4][i] = inifile.ReadFloat("GS", "Sy", -9999);
			S[6][4][i] = inifile.ReadFloat("GS", "UuShift", -9999);			
			S[7][4][i] = inifile.ReadFloat("GS", "VvShift", -9999);
			for (cnt=2; cnt <= 7; cnt++)
			{
				vchecklist = ["Nx","Ny","Sx","Sy","UuShift","VvShift"];
				if (typeof(S[cnt][4][i]) != "number" || S[cnt][4][i] == -9999)
				{
					App.ErrMsg(0,0,"Error in 'GS', value '" + checklist[cnt-1] + "', check Multisample.txt/SDVars.txt");

					Abort();
				}
			}

			S[8][4][i] = inifile.ReadString("GS","Name", "");
			S[13][4][i] = inifile.ReadInteger("GS", "WFMethod", -9999);
			if (S[13][4][i] != 1 && S[13][4][i] != 2 && S[13][4][i] != 3 && S[13][4][i] != 4)
			{
				App.ErrMsg(0,0,"Error in 'GS', value 'WFMethod', check Multisample.txt/SDVars.txt");
				Abort();
			}

			S[10][4][i] = inifile.ReadString("GS", "Markprocedure", "err");
			wfprocedureloadlist = GAlignprocedures.ReadString("LoadList", "load", "0").split(";");
			if (SearchArray(wfprocedureloadlist,S[10][4][i]) == -1 && S[10][4][i] != -1)
			{
				App.ErrMsg(0,0,"Value under 'Markprocedure' not found in Loadlist of Alignprocedures.txt.");
				Abort();
			}

			S[12][4][i] = inifile.ReadString("GS", "L61", "err"); 
			GDSmarkstring = S[12][4][i].split("-");
			GDSmarklist = GGDSIImarkertypes.ReadString("LoadList", "load", "0");
			GDSarray = GDSmarklist.split(";");
			if (SearchArray(GDSarray, GDSmarkstring[0]) == -1 && S[12][4][i] != -1)
			{
				App.ErrMsg(0,0,"Entered 'L61' marker not in Loadlist of L61markers.txt.");
				Abort();
			}

			S[14][4][i] = inifile.ReadInteger("GS", "Exposureloops", -9999);
			if (typeof(S[14][4][i]) != "number" || S[14][4][i] == -9999)
			{
				App.ErrMsg(0,0,"Error in 'GS', value 'Exposureloops', check Multisample.txt/SDVars.txt");
				Abort();
			}
 
			S[1][5][i] = inifile.ReadFloat("GS", "WF", -9999);
			if (typeof(S[1][5][i]) != "number" || S[1][5][i] == -9999)
			{
				App.ErrMsg(0,0,"Error in 'GS', value 'WF', check Multisample.txt/SDVars.txt");
				Abort();
			}
			colmode = inifile.ReadString("GS", "ColMode", "");
			S[2][5][i] = ReplaceAtbymu(colmode);
			cce = CheckColumnExists(S[2][5][i]);
			if (cce == -1)
			{
				App.ErrMsg(0,0,"Error 'ColMode' in 'GS' does not exist, check /Lib/Columndatasets.txt");
				Abort();
			}

			GDSIIpath = inifile.ReadString("GS", "GDSII", "err");
			CheckPathLength(GDSIIpath, i);
			if (FileExists(GDSIIpath) != 1)
			{
				App.ErrMsg(0,0,"Error in Multisample.txt/SDVars.txt: GDSII file not found.");
				Abort();
			}
			S[3][5][i] = inifile.ReadString("GS", "GDSII", "err");
			S[4][5][i] = inifile.ReadString("GS", "Struct", "err");
			if (S[4][5][i] == "err")
			{
				App.ErrMsg(0,0,"Error in 'GS', value 'Struct', check Multisample.txt/SDVars.txt");
				Abort();
			}
			wa = inifile.ReadString("GS", "WorkingArea", "err");
			workingarea = wa.split(",")
			if (isNaN(workingarea[0]) == 1 || isNaN(workingarea[1]) == 1 || isNaN(workingarea[2]) == 1 || isNaN(workingarea[3]) == 1 )
			{
				App.ErrMsg(0,0,"Error in 'GS', value 'WorkingArea', check Multisample.txt/SDVars.txt");
				Abort();
			}
			S[11][5][i] = wa;


			S[1][6][i] = inifile.ReadFloat("GS", "SSLine", -9999);
			S[2][6][i] = inifile.ReadFloat("GS", "SSArea", -9999);
			S[3][6][i] = inifile.ReadFloat("GS", "SSCurve", -9999);
			S[4][6][i] = inifile.ReadFloat("GS", "LineBS", -9999);
   			S[5][6][i] = inifile.ReadFloat("GS", "AreaBS", -9999);
   			S[6][6][i] = inifile.ReadFloat("GS", "CurveBS", -9999);
   			S[7][6][i] = inifile.ReadFloat("GS", "BeamCurrent", -9999);
   			S[8][6][i] = inifile.ReadFloat("GS", "WFOverpattern", -9999);
			for (cnt=1; cnt <= 8; cnt++)
			{
				checklist = ["SSLine","SSArea","SSCurve","LineBS","AreaBS","CurveBS","BeamCurrent","WFOverpattern"];
				if (typeof(S[cnt][6][i]) != "number" || S[cnt][6][i] == -9999)
				{
					App.ErrMsg(0,0,"Error in sample " + i + ", value '" + checklist[cnt-1] + "', check Multisample.txt/SDVars.txt");
					Abort();
				}
			}

   			StepsizeDwelltime(i, 0, 0); //This calculated and modifies beamspeeds if they are not correct in Multisample.txt or SDvars.txt
		}
  	
		if (st == 2)
		{
			S[1][4][i] = inifile.ReadString(it,"ExpLayers", "err");
			if (S[1][4][i] == "err")
			{
				App.ErrMsg(0,0,"Error in sample " + i + ", value 'ExpLayers', check Multisample.txt/SDVars.txt");
				Abort();
			}
			S[2][4][i] = inifile.ReadInteger(it, "Nx", -9999);
			S[3][4][i] = inifile.ReadInteger(it, "Ny", -9999);
			S[4][4][i] = inifile.ReadFloat(it, "Sx", -9999);
			S[5][4][i] = inifile.ReadFloat(it, "Sy", -9999);
			S[6][4][i] = inifile.ReadFloat(it, "UuShift", -9999);
			S[7][4][i] = inifile.ReadFloat(it, "VvShift", -9999);
			for (cnt=2; cnt <= 7; cnt++)
			{
				checklist = ["Nx","Ny","Sx","Sy","UuShift","VvShift"];
				if (typeof(S[cnt][4][i]) != "number" || S[cnt][4][i] == -9999)
				{
					App.ErrMsg(0,0,"Error in sample " + i + ", value '" + checklist[cnt-1] + "', check Multisample.txt/SDVars.txt");

					Abort();
				}
			}

			S[8][4][i] = inifile.ReadString(it,"Name", "");
			S[13][4][i] = inifile.ReadInteger(it, "WFMethod", -9999);
			if (S[13][4][i] != 1 && S[13][4][i] != 2 && S[13][4][i] != 3 && S[13][4][i] != 4)
			{
				App.ErrMsg(0,0,"Error in sample " + i + ", value 'WFMethod', check Multisample.txt/SDVars.txt");
				Abort();
			}

			S[10][4][i] = inifile.ReadString(it, "Markprocedure", "err");
			wfprocedureloadlist = GAlignprocedures.ReadString("LoadList", "load", "0").split(";");
			if (SearchArray(wfprocedureloadlist,S[10][4][i]) == -1 && S[10][4][i] != -1)
			{
				App.ErrMsg(0,0,"Value under 'Markprocedure' for sample " + i + " not found in Loadlist of Alignprocedures.txt.");
				Abort();
			}

			S[12][4][i] = inifile.ReadString(it, "L61", "err"); 
			GDSmarkstring = S[12][4][i].split("-");
			GDSmarklist = GGDSIImarkertypes.ReadString("LoadList", "load", "0");
			GDSarray = GDSmarklist.split(";");
			if (SearchArray(GDSarray, GDSmarkstring[0]) == -1 && S[12][4][i] != -1)
			{
				App.ErrMsg(0,0,"Entered 'L61' markers for sample" + i + " not found in Loadlist of L61markers.txt.");
				Abort();
			}

			S[14][4][i] = parseInt(inifile.ReadString(it, "Exposureloops", "err"));
			if (typeof(S[14][4][i]) != "number" || S[14][4][i] == "err")
			{
				App.ErrMsg(0,0,"Error in sample " + i + ", value 'Exposureloops', check Multisample.txt/SDVars.txt");
				Abort();
			}
 
			S[1][5][i] = inifile.ReadFloat(it, "WF", -9999);
			if (typeof(S[1][5][i]) != "number" || S[1][5][i] == -9999)
			{
				App.ErrMsg(0,0,"Error in sample " + i + ", value 'WF', check Multisample.txt/SDVars.txt");
				Abort();
			}
			colmode = inifile.ReadString(it, "ColMode", "");
			S[2][5][i] = ReplaceAtbymu(colmode);
			cce = CheckColumnExists(S[2][5][i]);
			if (cce == -1)
			{
				App.ErrMsg(0,0,"Error 'ColMode' for sample " + i + " does not exist, check /Lib/Columndatasets.txt");
				Abort();
			}
			GDSIIpath = (inifile.ReadString(it, "GDSII", "err"));
			CheckPathLength(GDSIIpath, i);
			if (FileExists(GDSIIpath) != 1)
			{
				App.ErrMsg(0,0,"Error in Multisample.txt/SDVars.txt: GDSII file not found.");
				Abort();
			}
			S[3][5][i] = (inifile.ReadString(it, "GDSII", "err"));
			S[4][5][i] = (inifile.ReadString(it, "Struct", "err"));
			if (S[4][5][i] == "err")
			{
				App.ErrMsg(0,0,"Error in sample " + i + ", value 'Struct', check Multisample.txt/SDVars.txt");
				Abort();
			}

			wa = inifile.ReadString(it, "WorkingArea", "err");
			workingarea = wa.split(",");
			if (isNaN(workingarea[0]) == 1 || isNaN(workingarea[1]) == 1 || isNaN(workingarea[2]) == 1 || isNaN(workingarea[3]) == 1 )
			{
				App.ErrMsg(0,0,"Error in sample " + i + ", value 'WorkingArea', check Multisample.txt/SDVars.txt");
				Abort();
			}
			S[11][5][i] = wa;
			
			S[1][6][i] = inifile.ReadFloat(it, "SSLine", -9999);
			S[2][6][i] = inifile.ReadFloat(it, "SSArea", -9999);
			S[3][6][i] = inifile.ReadFloat(it, "SSCurve", -9999);
			S[4][6][i] = inifile.ReadFloat(it, "LineBS", -9999);
   			S[5][6][i] = inifile.ReadFloat(it, "AreaBS", -9999);
   			S[6][6][i] = inifile.ReadFloat(it, "CurveBS", -9999);
   			S[7][6][i] = inifile.ReadFloat(it, "BeamCurrent", -9999);
   			S[8][6][i] = inifile.ReadFloat(it, "WFOverpattern", -9999);
			for (cnt=1; cnt <= 8; cnt++)
			{
				checklist = ["SSLine","SSArea","SSCurve","LineBS","AreaBS","CurveBS","BeamCurrent","WFOverpattern"];
				if (typeof(S[cnt][6][i]) != "number" || S[cnt][6][i] == -9999)
				{
					App.ErrMsg(0,0,"Error in sample " + i + ", value '" + checklist[cnt-1] + "', check Multisample.txt/SDVars.txt");
					Abort();
				}
			}
   			StepsizeDwelltime(i, 0, 0); //This recalculates and modifies beamspeeds if they are not correct in Multisample.txt or SDvars.txt	
		}
	}	
	
	if (SDflag == 0)
	{
		if (App.ErrMsg(4, 0,"Multisample.txt successfully loaded. Use pre-set beamcurrent and stepsize?") == 7)
		{

    		if (st == 1)
			{
				App.ErrMsg(0, 0, "Column parameters will be activated. Enter beamcurrent and modify stepsizes.");
				Panicbutton();
				SetSvars(1, 1, 1);
				Panicbutton();
				MeasBeamCurrent();
	    		StepsizeDwelltime(1, 2, 1);
	    		SetStepsizeDwelltime(1);
			}

    		if (st == 2)
    		{
    			App.ErrMsg(0, 0, "Column parameters will be sequentially activated for all samples. Measure beamcurrents and modify stepsizes.");
    			for (i = 1; i <= Gnums; i++)
    			{			
	    			Panicbutton();
	    			SetSvars(i, 1, 1);
	    			App.ErrMsg(0, 0, "Settings for sample " + i + " are now activated.");
	    			Panicbutton();
					if (i == 1) 
					{
						MeasBeamCurrent();
					}				
					else
					{
						if (S[2][5][i] != S[2][5][i-1]) MeasBeamCurrent();	
					}
					StepsizeDwelltime(i, 2, 1);
					SetStepsizeDwelltime(i);			
				}    			
    		}
    		
		}
 	}
	else
	{
		if (App.ErrMsg(4, 0,"SDvars.txt successfully loaded. Use pre-set beamcurrent and stepsize?") == 6)
		{
			Gmeasbcflag = 0;
		}
		CollectUV(st, 2);  //After loading SDvars.txt, start collection of UV coords. Set GUIflag = 2 since all other variables are already loaded.	
	}
    return(S);
}


function CollectSD(st, GUIflag)
{
    var mflag = 0;
	var i, it, wfprocedureloadlist, S14, S24, S34, S44, S54, S64, S74, S84, S86, S94, S104, S124, S134, S144, S15, S25, S35, S45, currpath, fex, currstruct, tl, check;
	var GDSmarklist, GDSmark;
	check = -1;
	collectinguvflag = 1;
	Gnums = App.InputMsg("Select amount of UV alignments (one additional alignment requirement per column change)", "Select a number 1-99", "1");
	if (Gnums == "") Abort();
    S = createArray(99,7,Gnums+1);

	if (Gnums != parseInt(Gnums) || Gnums > 99 || Gnums < 1)
	{
		App.ErrMsg(0,0,"Input is no integer or > 99.");
		Abort();
	}
	
	for (i = 1; i <= Gnums; i++)   
	{
		it = "sample " + i;
		
		if (i <= Gnums && mflag == 0)
		{
				
			//if (mflag == 1) break;
			if (st == 1) App.Errmsg(0,0, "Enter data for all used samples in the following dialogue boxes.");
			if (st == 2) App.Errmsg(0,0, "Enter data for " + it + " in the following dialogue boxes.");
			Panicbutton();
			S84 = App.InputMsg("Sample name","Enter name for sample(s) (for log)","");
			if (S84 == "") 
			{
				Logdata();
				Abort();
			}
			if (GUIflag == 2)
			{
				currpath = App.GetVariable("GDSII.Database");
				fex = 0;
				while (fex != 1)
				{
					S35 = App.InputMsg("Select GDSII database file.", "Enter the full path", currpath);
					if (S35 == "") 
					{
						Logdata();
						Abort();
					}
					CheckPathLength(S35, i);
					fex = FileExists(S35);
					
					if (fex != 1)
					{
						App.Errmsg(0,0,"Please enter correct path");
					}
				}
				currstruct = App.GetVariable("Variables.StructureName");
				S45 = App.InputMsg("Choose structure", "Type the name of the structure (case sensitive):", currstruct);
				if (S45 == "") 
				{
					Logdata();
					Abort();
				}
				if (S45 == "") S45 = currstruct;

				currwa = GetActiveWorkingArea(S35, S45);
				S115 = App.InputMsg("Set Working Area", "Bottomleft U, V, TopRight U, V (separate by ',')", currwa);

		    	S15 = App.InputMsg("Choose writefield in µm", "Select writefield size, make sure it exists", S15);
				if (S15 == "") 
				{
					Logdata();
					Abort();
				}
				S25 = App.InputMsg("Column settings", "Type name of column dataset (format= group: name). You can use '@' for '\u03BC' symbol.", LastDatasettoColset());
				S25 = ReplaceAtbymu(S25);
				var cce = CheckColumnExists(S25);
				if (cce == -1)
				{
					App.ErrMsg(0,0,"Error 'ColMode' in 'GS' does not exist, check /Lib/Columndatasets.txt");
					Abort();
				}


				if (S25 == "") 
				{
					Logdata();
					Abort();
				}
				S25 = ReplaceAtbymu(S25);
    		}
			
			check = -1;
			while (check != 1)			
			{
				S134 = App.Inputmsg("Select type of rough WF alignment","1: All structures, 2: First structure per sample, 3: Manual per sample, 4: No alignment", "1");
				Panicbutton();
				if (S134 == "") 
				{
					Logdata();
					Abort();
				}
				if (S134 == 1 || S134 == 2 || S134 == 3 || S134 == 4)
				{
					check = 1;
				}
				else
				{
					App.ErrMsg(0,0,"Nonvalid entry.");
					check = -1;
				}
				
			}

			check = -1;
			while (check != 1)
			{
				if (S134 ==  1 || S134 == 2 )
				{
					wfprocedureloadlist = GAlignprocedures.ReadString("LoadList", "load", "0").split(";");
					S104 = App.InputMsg("Select rough WF align scanmark procedure", "Select: " + wfprocedureloadlist, wfprocedureloadlist[0]);
					if (S104 == "") 
					{
						Logdata();
						Abort();
					}
					Panicbutton();
					if (SearchArray(wfprocedureloadlist,S104) == -1)
					{
						App.ErrMsg(0,0,"Non-existing scan procedure. Check Alignprocedures.txt and re-enter.");
					}
					else
					{
						check = 1;
					}
				}
				else
				{
					S104 = -1;
					check = 1;
				}	
			}
			
			if (App.ErrMsg(4,0,"Use fine WF alignment using L61 GDSII auto linescans?")==EA_YES)
			{
				tl = App.InputMsg("Select layer", "Select layer(s) to use together with layer 61 (separate by ';')","");
				tl = tl.replace(",", ";");
				if (tl == "") 
				{
					Logdata();
					Abort();
				}
				Panicbutton();
				GDSmarklist = GGDSIImarkertypes.ReadString("LoadList", "load", "0");
				
				check = -1;
				while (check != 1)
				{
					GDSmark = App.InputMsg("Select GDSII marker corresponding to scans drawn in design", "Choose: " + GDSmarklist, GDSmarklist[0]);
					Panicbutton();
					if (GDSmark == "") 
					{
						Logdata();
						Abort();
					}
					GDSarray = GDSmarklist.split(";");
					if (SearchArray(GDSarray, GDSmark) == -1)
					{
						App.ErrMsg(0,0,"Non-existing GDS markers. Check GDSmarkers.txt and re-enter");
					}
					else
					{
						check = 1;
					}
				}
					
				check = -1;
				while (check == -1)
				{
					GDSproc = App.InputMsg("Select GDSII procedure when stitching", "Choose: '1' for scanning all writefields, '2' for scanning only the first.", "1");
					if (GDSproc == "")
					{
						Logdata();
						Abort();
					} 
					if (GDSproc == 1 || GDSproc == 2)
					{
						check = 1;
						S124 = GDSmark + "-" + GDSproc + "-" + tl;
					}
					else
					{
						App.ErrMsg(0,0,"Please choose '1' or '2'");
					}
				}
				

				if (App.ErrMsg(4,0,"Do you want to write other layers in a global alignment?")==EA_YES)
				{
					S14 = App.InputMsg("Choose layers", "Select (separate by ';') ", "0");
					S14 = S14.replace(",",";");
					if (S14 == "") 
					{
						Logdata();
						Abort();
					}
					Panicbutton();
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
				S14 = S14.replace(",",";");
				if (S14 == "") 
				{
					Logdata();
					Abort();
				}
			}
			
			check = -1;
			while (check != 1)
			{
				S24 = App.InputMsg("Define sample dimensions in x (U)", "Select number of structures: x (U)", "2");
				Panicbutton();
				if (S24 == "") 
				{
					Logdata();
					Abort();
				}
				if (isNaN(parseInt(S24)))
				{
					App.ErrMsg(0,0,"Please input an integer number");
				}
				else
				{
					check = 1;
				}
			}

			check = -1;
			while (check != 1)
			{
				S34 = App.InputMsg("Define sample dimensions in y (V)", "Select number of structures: y (V)", "2");
				if (S34 == "") 
				{
					Logdata();
					Abort();
				}
				Panicbutton();
				if (isNaN(parseInt(S34)))
				{
					App.ErrMsg(0,0,"Please input an integer number");
				}
				else
				{
					check = 1;
				}			
			}
			
			if (S24 != 1)
			{
				check = -1;
				while (check != 1)
				{
					S44 = App.InputMsg("Define structure spacing in (U)", "Select structure spacing in mm: x (U)", "5");
					Panicbutton();
					if (S44 == "") 
					{
						Logdata();
						Abort();
					}
					if (isNaN(parseFloat(S44)))
					{
						App.ErrMsg(0,0,"Please input a number.");
					}
					else
					{
						check = 1;
					}			
				}	
			}
			else
			{
				S44 = "1";
			}

			if (S34 != 1)
			{
				check = -1;
				while (check != 1)
				{
					S54 = App.InputMsg("Define structure spacing in (V)", "Select structure spacing in mm: y (V)", "5");
					if (S54 == "") 
					{
						Logdata();
						Abort();
					}
					Panicbutton();
					if (S54 == "") 
					{
						Logdata();
						Abort();
					}
					if (isNaN(parseFloat(S54)))
					{
						App.ErrMsg(0,0,"Please input a number.");
					}
					else
					{
						check = 1;
					}			
				}	
			}
			else
			{
				S54 = "1";
			}		

			check = -1;
			while (check != 1)
			{
				S64 = App.InputMsg("Define Global-Local shift (U) for 1st structure", "Select shift in mm: x (U)", "0");
				if (S64 == "") 
				{
					Logdata();
					Abort();
				}
				Panicbutton();
				if (isNaN(parseFloat(S64)))
				{
					App.ErrMsg(0,0,"Please input a number.");
				}
				else
				{
					check = 1;
				}			
			}

			check = -1;
			while (check != 1)
			{
				S74 = App.InputMsg("Define Global-Local shift (V) for 1st structure", "Select shift in mm: v (V)", "0");
				if (S74 == "") 
				{
					Logdata();
					Abort();
				}
				Panicbutton();
				if (isNaN(parseFloat(S74)))
				{
					App.ErrMsg(0,0,"Please input a number.");
				}
				else
				{
					check = 1;
				}			
			}		
			
			//S144 = App.InputMsg("Number of exposureloops per device","#", "1");
			S144 = "1";

			if (S14 != -1)
			{ 
				
				check = -1;
				while (check != 1)
				{
					S86 = App.InputMsg("Writefield overpattern (only used in global alignment)", "Percentage of overpattern (prevents stitching errors, recommended values 0-0.5)", "0.2");
					if (S86 == "") 
					{
						Logdata();
						Abort();
					}
					Panicbutton();
					if (isNaN(parseFloat(S86)))
					{
						App.ErrMsg(0,0,"Please input a number.");
					}
					else
					{
						check = 1;
					}				
				}	
			}
			else
			{
				S86 = "0.0";
			}
			//S44 = 5;
			//S54 = 5;
			//S64 = 0;
			//S74 = 0;
			S94 = st;
				
			if (st == 1) mflag = 1;
				
		}
		S[1][4][i] = S14 + "";
		S[2][4][i] = parseInt(S24);
		S[3][4][i] = parseInt(S34);
		S[4][4][i] = parseFloat(S44);
		S[5][4][i] = parseFloat(S54);
		S[6][4][i] = parseFloat(S64);
		S[7][4][i] = parseFloat(S74);
		S[8][4][i] = S84;
		S[10][4][i] = S104;
		S[12][4][i] = S124 + "";
		S[13][4][i] = S134 + "";
		S[1][5][i] = S15 + "";	
		S[14][4][i] = parseInt(S144);
		S[8][6][i] = parseFloat(S86);
		//Add a list of parameter that are always applicable to all loaded samples.
		if (i==1)
		{
			S[9][4][1] = parseFloat(S94);
			S[11][4][1] = Gnums;	
		}
		
			
		if (GUIflag == 2)
		{
		S[1][5][i] = S15 + "";
		S[2][5][i] = S25 + "";
		S[3][5][i] = S35;
		S[4][5][i] = S45;
		Logdata();
		}
	}
	S = CollectUV(st, GUIflag);

	return(S);
}

function CollectUV(st, GUIflag)
{
	var i, j, m, maf, wd, userinput, awfvars, amf, lastcolset;
// Add loop so that this is only asked once if st == 1
    if (GUIflag == 1)
    {	
    	if (App.ErrMsg(8,0,"Collecting three point alignments for all samples commences. Activate desired Column settings and WriteField. USE GLOBAL UV ALIGNMENT!") ==2 )
    	{
    		Logdata();
    		Abort();
    	}
	}


	if (GUIflag == 2)
    {	
    	if (App.ErrMsg(8,0,"Collecting three point alignments for all samples commences. USE GLOBAL UV ALIGNMENT!") == 2)
    	{
    		Logdata();
    		Abort();
    	}
	}

	Panicbutton();
	for (i = 1; i <= Gnums; i++)
    {
		Stage.GlobalAlignment();
		if (i != 1) Stage.ResetAlignment();

	    if (GUIflag == 1)
		{
			if (App.ErrMsg(8,0,"Perform UV alignment on sample " + i + " of " + Gnums + ". The now opened GDSII file and structure are logged and used for exposure.") == 2)
			{
				Logdata();
				Abort();
			}
			Panicbutton();
		}
		if (GUIflag == 2)
		{
			SetSvars(i, 0, 0);
			//App.Exec("OpenDatabase(" + S[3][5][i] + ")");
			//App.Exec("ViewStructure(" + S[4][5][i] + ")");
			//App.Exec("SetWorkingArea(" + S[11][5][i] + ")")

			if (App.ErrMsg(8,0,"Column and writefield set, now perform UV alignment on sample " + i + " of " + Gnums + ".") == 2)
			{
				Logdata();
				Abort();
			}
			Panicbutton();		
		}

	    App.Exec("Halt()");
	    App.Exec("BeamOff()");
	    Panicbutton();
	    if (S[13][4][i] == 1 || S[13][4][i] == 2)
		{
			
			while (userinput != 7)
			{
				awfvars = AlignWF(S[10][4][i], 0, 1, 1, 1); //align a writefield or not depending on S[10][4][i]
				amf = awfvars[1];
				if (amf <= 1) break;
				if (amf >= 2)
				{
					userinput = App.ErrMsg(9,0,"Less than three Marks found during procedure. Try scanning again? (Change Markers.txt). No continues while Cancel quits the script.");
					if (userinput == 2) 
					{
						Logdata();
						Abort();
					}
				}	
			}
			
		}	
		if (S[13][4][i] == 3)
		{	
		 // fix this to be compatble with manual WF alignment	
		}	    

	    if (App.ErrMsg(8,0,"Check UV alignment + focus after WF change of sample " + i + " of " + Gnums + ". CORRECT DESIGN FILE / WORKINGAREA / WRITEFIELD / COLUMN ACTIVATED?") == 2)
	    	{
	    		Logdata();
	    		Abort();
	    	}
	    //COLUMN_Mag(100000.)
	    App.Exec("Halt()");
	    Panicbutton();
	    if (Gmeasbcflag == 1)
	    {
	    	if (st == 1 && i == 1) 
	    	{
	    		MeasBeamCurrent();
	    		StepsizeDwelltime(i, GUIflag, 1);
		    	SetStepsizeDwelltime(i);
	    	}
	    	if (st == 1 && i != 1) 
	    	{
	    		S[1][6][i] = S[1][6][1];
	    		S[2][6][i] = S[2][6][1];
	    		S[3][6][i] = S[3][6][1];
	    		S[4][6][i] = S[4][6][1];
	    		S[5][6][i] = S[5][6][1];
	    		S[6][6][i] = S[6][6][1];
	    		S[7][6][i] = S[7][6][1];
	    	}
			if (st == 2 && i == 1) MeasBeamCurrent();
			if (st == 2 && i !=1)
			{
				lastcolset = LastDatasettoColset();
				if (lastcolset != S[2][5][i-1]) MeasBeamCurrent();
			}
			if (st == 2) 
  			{
   				StepsizeDwelltime(i, GUIflag, 1);
				SetStepsizeDwelltime(i);
  			}
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

		if (GUIflag == 1)
		{
			S[1][5][i] = parseInt(App.GetVariable("Variables.WritefieldHeight"));
			S[2][5][i] = LastDatasettoColset();
			S[3][5][i] = App.GetVariable("GDSII.Database");
			S[4][5][i] = App.GetVariable("Variables.StructureName");
			S[11][5][i] = GetActiveWorkingArea(S[3][5][i], S[4][5][i]);
		}
		
		App.Exec("GetCorrection()");
		S[5][5][i] = App.GetVariable("Variables.ZoomX");
		S[6][5][i] = App.GetVariable("Variables.ZoomY");
		S[7][5][i] = App.GetVariable("Variables.ShiftX");
		S[8][5][i] = App.GetVariable("Variables.ShiftY");
		S[9][5][i] = App.GetVariable("Variables.RotX");
		S[10][5][i] = App.GetVariable("Variables.RotY");
		Logdata();
	}
    collectinguvflag = 0;
    return (S);
}

function GetUVWF()
{
		//GetUVdata
		App.ErrMsg(0,0,"Make sure the Writefield is saved and the UV alignment is correct.");
		App.Exec("Halt()");
		var m, maf, wd, j;
		S = createArray(99,7,Gnums+1);
		for (j = 1; j <= 3; j++)
		{
			m = App.GetVariable("GLOBALADJUST.Mark" + j).split(",");
			maf = App.GetVariable("AUTOFOCUS.Mark" + j).split(",");
			wd = App.GetVariable("AUTOFOCUS.WD" + j);

			S[1][j][1] = parseFloat(m[1]);
			S[2][j][1] = parseFloat(m[2]);
			S[3][j][1] = wd + "";
			S[4][j][1] = parseFloat(m[3]);
			S[5][j][1] = parseFloat(m[4]);
			S[6][j][1] = maf[2] + "";
			S[7][j][1] = parseFloat(m[0]);
	    }
		//GetWFData
		App.Exec("GetCorrection()");
		S[1][5][1] = parseInt(App.GetVariable("Variables.WritefieldHeight"));
		S[5][5][1] = App.GetVariable("Variables.ZoomX");
		S[6][5][1] = App.GetVariable("Variables.ZoomY");
		S[7][5][1] = App.GetVariable("Variables.ShiftX");
		S[8][5][1] = App.GetVariable("Variables.ShiftY");
		S[9][5][1] = App.GetVariable("Variables.RotX");
		S[10][5][1] = App.GetVariable("Variables.RotY");

		//WriteUVData
		for (j = 1; j <= 3; j++)
		{	          
			GUVini.WriteString("Sx", "U" + j, S[1][j][1] + "");
			GUVini.WriteString("Sx", "V" + j, S[2][j][1] + "");
			GUVini.WriteString("Sx", "WD" + j, S[3][j][1] + "");
			GUVini.WriteString("Sx", "X" + j, S[4][j][1] + "");
			GUVini.WriteString("Sx", "Y" + j, S[5][j][1] + "");
			GUVini.WriteString("Sx", "Z" + j, S[6][j][1] + "");
			GUVini.WriteString("Sx", "MarkValid" + j, S[7][j][1] + "");
		}
		
		//WriteWFData
		GUVini.WriteString("Sx", "WF", S[1][5][1] + "");
		GUVini.WriteString("Sx", "WFZoomU", S[5][5][1] + "");
		GUVini.WriteString("Sx", "WFZoomV", S[6][5][1] + "");
		GUVini.WriteString("Sx", "WFShiftU", S[7][5][1] + "");
		GUVini.WriteString("Sx", "WFShiftV", S[8][5][1] + "");
		GUVini.WriteString("Sx", "WFRotU", S[9][5][1] + "");
		GUVini.WriteString("Sx", "WFRotV", S[10][5][1] + "");	

		App.ErrMsg(0,0,"UV alignment and WF values succesfully copied to UVvars.txt");
}

function Logdata()
{
	var Glogini, it, j; 

	st = S[9][4][1];
    Glogini = App.OpenInifile(Glogfilename[1] + Glogfilename[2]);
	Glogini.WriteString("GS","Procedure", S[9][4][1]);
	Glogini.WriteString("GS","n-Samples", S[11][4][1]);
	Glogini.WriteString("GS", "User", App.GetVariable("Variables.LastUser"));
	
	if (st == 1)
	{
	    Glogini.Writestring("GS", "Name", S[8][4][1]);
	    Glogini.WriteString("GS", "GDSII", S[3][5][1] + "");
		Glogini.WriteString("GS", "Struct", S[4][5][1] + "");
	    Glogini.WriteString("GS", "ExpLayers", S[1][4][1] + "");
	    Glogini.WriteString("GS", "Nx", S[2][4][1] + "");
	    Glogini.WriteString("GS", "Ny", S[3][4][1] + "");
	    Glogini.WriteString("GS", "Sx", S[4][4][1] + "");
	    Glogini.WriteString("GS", "Sy", S[5][4][1] + "");
		Glogini.WriteString("GS", "UuShift", S[6][4][1] + "");
		Glogini.WriteString("GS", "VvShift", S[7][4][1] + "");
		Glogini.Writestring("GS", "WFMethod", S[13][4][1] + "");
		Glogini.Writestring("GS", "Markprocedure", S[10][4][1]);
		Glogini.Writestring("GS", "L61", S[12][4][1]);	
		Glogini.Writestring("GS", "Exposureloops", S[14][4][1]);	
		Glogini.WriteString("GS", "WF", S[1][5][1] + "");
		Glogini.WriteString("GS", "ColMode", S[2][5][1] + "");
		Glogini.WriteString("GS", "SSLine", S[1][6][1] + "");
		Glogini.WriteString("GS", "SSArea", S[2][6][1] + "");
		Glogini.WriteString("GS", "SSCurve", S[3][6][1] + "");
		Glogini.WriteString("GS", "LineBS", S[4][6][1] + "");
		Glogini.WriteString("GS", "AreaBS", S[5][6][1] + "");
		Glogini.WriteString("GS", "CurveBS", S[6][6][1] + "");
		Glogini.WriteString("GS", "BeamCurrent", S[7][6][1] + "");
		Glogini.WriteString("GS", "WFOverpattern", S[8][6][1] + "");
		Glogini.WriteString("GS", "WorkingArea", S[11][5][1] + "");
	}	

    for (i = 1; i <= Gnums; i++)
    {
        it = "S" + i; 
		if (st == 2)
		{	
			Glogini.Writestring(it,"Name", S[8][4][i]);
			Glogini.WriteString(it,"GDSII", S[3][5][i] + "");
			Glogini.WriteString(it,"Struct", S[4][5][i] + "");
			Glogini.WriteString(it, "ExpLayers", S[1][4][i] + "");
			Glogini.WriteString(it, "Nx", S[2][4][i] + "");
			Glogini.WriteString(it, "Ny", S[3][4][i] + "");
			Glogini.WriteString(it, "Sx", S[4][4][i] + "");
			Glogini.WriteString(it, "Sy", S[5][4][i] + "");
			Glogini.WriteString(it, "UuShift", S[6][4][i] + "");
			Glogini.WriteString(it, "VvShift", S[7][4][i] + "");
			Glogini.Writestring(it, "WFMethod", S[13][4][i] + "");
			Glogini.Writestring(it,"Markprocedure", S[10][4][i]);	
			Glogini.Writestring(it, "L61", S[12][4][i]);
			Glogini.Writestring(it, "Exposureloops", S[14][4][i]);	
			Glogini.WriteString(it,"WF", S[1][5][i] + "");
			Glogini.WriteString(it,"ColMode", S[2][5][i] + "");
			Glogini.WriteString(it, "SSLine", S[1][6][i] + "");
			Glogini.WriteString(it, "SSArea", S[2][6][i] + "");
			Glogini.WriteString(it, "SSCurve", S[3][6][i] + "");
			Glogini.WriteString(it, "LineBS", S[4][6][i] + "");
			Glogini.WriteString(it, "AreaBS", S[5][6][i] + "");
			Glogini.WriteString(it, "CurveBS", S[6][6][i] + "");
			Glogini.WriteString(it, "BeamCurrent", S[7][6][i] + "");
			Glogini.WriteString(it, "WFOverpattern", S[8][6][i] + "");
			Glogini.WriteString(it, "WorkingArea", S[11][5][i] + "");
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
		
		Glogini.WriteString(it, "WFZoomU", S[5][5][i] + "");
		Glogini.WriteString(it, "WFZoomV", S[6][5][i] + "");
		Glogini.WriteString(it, "WFShiftU", S[7][5][i] + "");
		Glogini.WriteString(it, "WFShiftV", S[8][5][i] + "");
		Glogini.WriteString(it, "WFRotU", S[9][5][i] + "");
		Glogini.WriteString(it, "WFRotV", S[10][5][i] + "");		
	}
	CopyLog();
	fso = new ActiveXObject("Scripting.FileSystemObject");
	fso.CopyFile(Glogfilename[1] + Glogfilename[2], Glogfilename[1] + "LastLog.txt", true);
    return(Glogfilename);
}

function AlignUV(i)
{
	Stage.ResetAlignment(); 
	Stage.GlobalAlignment();
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
	var fso, p1 , p2;
	GenerateBatchFile();
	//App.Exec("SetLaserStageCtrl(LASER)"); //Turn on laser stage control, just to be sure, not for Elphy unfortunately :*(
	App.SetVariable("Automation/Links.0",Gfilepath + Gsn + ".js");
	fso = new ActiveXObject("Scripting.FileSystemObject");
	if (fso.FolderExists(Gfilepath))
	{
	}
	else
	{
		fso.CreateFolder(Gfilepath);
	}
	p1 = ExpandPath("%userroot%\\Record\\ScanMacros\\");
	fso.CopyFile(Glib + "Multisample WF align.rec", p1, true);
	p2 = ExpandPath("%root%\\Lib\\System\\");
	if (restoreflag == 1)
	{
		App.SetVariable("Exposure.SingleField", "ON") //Software needs restart for option to work.
		App.SetVariable("ScanManager.LaserStage", "OFF")
		App.SetVariable("JoinElements.DosePercent", "10")
		fso.CopyFile(Glib + "AlignWForg\\AlignWFAuto.js", p2, true);
		App.Exec("ResetModule(Scan Manager)");
	}
	else
	{
		//App.SetVariable("Exposure.SingleField", "OFF") //Software needs restart for option to work.
		App.SetVariable("ScanManager.LaserStage", "ON")
		App.SetVariable("JoinElements.DosePercent", "20") //Experimental!!
		fso.CopyFile(Glib + "AlignWFAuto.js", p2, true);
		//App.Exec("ResetModule(Scan Manager)");
	}
	fso.Close;
}

function RemoveGDSlogflag()
{
	var p3, scanini;
	p3 = ExpandPath("%userroot%\\System\\");
	scanini = App.OpenIniFile(p3 + "Scan.ini");
	scanini.WriteString("Interact", "log", 0);
}	

function InstallGDSmarker(markertype, k, mj) //Installs GDSII marker properties into system.
{
	var GDSmarkertypes, n, m, q, p3, WFalignini, parlist, scanini, par;
	GDSmarkertypes = LoadGDSIIMarkers();
	for (n = 0; n < GDSmarkertypes.length; n++)
	{
		if (GDSmarkertypes[n][0] == markertype) 
		{
			m = n;
			break;
		}
	}

	p3 = ExpandPath("%userroot%\\System\\");
	WFalignini = App.OpenIniFile(Glib + "GDSII Linescan.ini");
	parlist = WFalignini.ReadSection("Automatic procedure during exposure").split(",");
	scanini = App.OpenIniFile(p3 + "Scan.ini");
	scanini.DeleteSection("Automatic procedure during exposure");
	for (q = 0; q < parlist.length; q ++) 
	{
		par = WFalignini.ReadString("Automatic procedure during exposure", parlist[q], "0");
		scanini.WriteString("Automatic procedure during exposure", parlist[q], par);
	}
	scanini.WriteString("Interact", "log", GDSmarkertypes[m][8]);
	scanini.WriteString("Interact", "path", Gfilepath);
	scanini.WriteString("Interact", "logfile", Glogfilename[1] + Gprogressfilename);
	scanini.WriteString("Interact", "sample_n", i);
	scanini.WriteString("Interact", "nx", mj);
	scanini.WriteString("Interact", "ny", k);

	App.SetVariable("AlignScans.AvgPoints", GDSmarkertypes[m][2]);                    //Sets the number of points in the y-direction
    App.SetVariable("AlignScans.Scanpoints", GDSmarkertypes[m][1]);                 //Sets the number of points in the x-direction
    App.Setvariable("AlignScans.Avg", GDSmarkertypes[m][3]);                          //Sets the number of measurements to average over to obtain one point
	

	var iniTest = App.OpenIniFile(ExpandPath("%userroot%\\System\\LineScanFilter.ini"));//Opens .ini file threshold algorithm            
    
	if (iniTest)                                                     //Loop deletes previous entry and enters 'threshold' in Writefield Alignment
    { 
        if ( iniTest.SectionExists("Threshold")==true )                //If the header Threshold is found, it is deleted
        iniTest.DeleteKey("Threshold", "Align write field"); 
        iniTest.WriteString("Threshold", "Align write field", GDSmarkertypes[m][7]);//The new values are entered from string 'threshold'  
    }

}

function InstallWFAlign(threshold) //Installs markerproperties into systems Scan.ini, called from AutoWFAlign
{	
	var p3, WFalignini, par, parlist, scanini, q; 
	p3 = ExpandPath("%userroot%\\System\\");

	WFalignini = App.OpenIniFile(Glib + "Multisample WF align.ini");
	parlist = WFalignini.ReadSection("Multisample WF align").split(",");
	scanini = App.OpenIniFile(p3 + "Scan.ini");
	scanini.DeleteSection("Multisample WF align");
	for (q = 0; q < parlist.length; q ++) 
	{
		par = WFalignini.ReadString("Multisample WF align", parlist[q], "0");
		scanini.WriteString("Multisample WF align", parlist[q], par);
	}

	var iniTest = App.OpenIniFile(ExpandPath("%userroot%\\System\\LineScanFilter.ini"));//Opens .ini file threshold algorithm            
    
	if (iniTest)                                                     //Loop deletes previous entry and enters 'threshold' in Writefield Alignment
    { 
        if ( iniTest.SectionExists("Threshold")==true )                //If the header Threshold is found, it is deleted
        iniTest.DeleteKey("Threshold", "Align write field"); 
        iniTest.WriteString("Threshold", "Align write field", threshold);//The new values are entered from string 'threshold'  
    }
	
	App.Exec("ResetModule(Scan Manager)");
}

function LoadGDSIIMarkers()
{
	var GDSmarkertypes, loadlist, q, p, parlist, markerdata;
	loadlist = GGDSIImarkertypes.ReadString("LoadList", "load", "0").split(";");
	GDSmarkertypes = createArray(loadlist.length,20);
	for (q = 0; q < loadlist.length; q ++) 
	{
		parlist = new Array("ScanpointsLength","ScanpointsWidth","Averaging","MarkerWidth","WidthTolerance","ContrastThresholdLow","ContrastThresholdHigh","Profile", "Log");
		markerdata = new Array(parlist.length);
		for (p = 0; p < parlist.length; p ++) 
		{
			markerdata[p] = GGDSIImarkertypes.ReadFloat(loadlist[q], parlist[p], -9999);

			if (markerdata[p] == -9999) 
			{
    			App.ErrMsg(0,0,"Markertype '" + loadlist[q] + "' not configured properly. Check Markers.txt and restart script.");
    			Abort();
			}
			markerdata[p] = markerdata[p].toString();
		}
		GDSmarkertypes[q][0] = loadlist[q]; 
		GDSmarkertypes[q][1] = markerdata[0]; //ScanpointsLength
		GDSmarkertypes[q][2] = markerdata[1]; //ScanpointsWidth
		GDSmarkertypes[q][3] = markerdata[2]; //Averaging
		GDSmarkertypes[q][4] = markerdata[3]; //Markerwidth
		GDSmarkertypes[q][5] = Math.ceil((markerdata[3]*1 - markerdata[4]*markerdata[3])*1000);//Profile min
		GDSmarkertypes[q][6] = Math.ceil((markerdata[3]*1 + markerdata[4]*markerdata[3])*1000);//Profile max
		GDSmarkertypes[q][7] = "Mode:0,L1:" + markerdata[5] + ",L2:" + markerdata[6] + ",Profile:" + markerdata[7] + ",Min:" + GDSmarkertypes[q][5] + ",Max:" + GDSmarkertypes[q][6] + ",LFL:0,RFL:1,LNo:1,RNo:1,LeftE:0.5,RightE:0.5,DIS:0,ZL:0,ZR:0";//threshold
		GDSmarkertypes[q][8] = markerdata[8];
	}
	return GDSmarkertypes;
}

function LoadMarkers()
{
	var Markertypes, loadlist, q, p, parlist, markerdata;
	loadlist = GMarkertypes.ReadString("LoadList", "load", "0").split(";");
	Markertypes = createArray(loadlist.length,20);

	for (q = 0; q < loadlist.length; q ++) 
	{
		parlist = new Array("CenterU","CenterV","MarkerWidth","MarkerLengthU","MarkerLengthV","CenterScanOffset","ScanLength","ScanWidth","ScanAccuracy","WidthTolerance","ContrastThresholdLow","ContrastThresholdHigh","Profile");
		markerdata = new Array(parlist.length);
		for (p = 0; p < parlist.length; p ++) 
		{
			markerdata[p] = GMarkertypes.ReadString(loadlist[q], parlist[p], "undefined");

			if (markerdata[p] == "undefined") 
			{
    			App.ErrMsg(0,0,"Markertype '" + loadlist[q] + "' not configured properly. Check Markers.txt and restart script.");
    			Abort();
			}
		}
		Markertypes[q][0] = loadlist[q]; 
		Markertypes[q][1] = markerdata[0]; //Upos
		Markertypes[q][2] = markerdata[1]; //Vpos
		Markertypes[q][3] = markerdata[6]; //SizeU (actually ScanLength)
		Markertypes[q][4] = markerdata[7]; //SizeV (actually ScanWidth)

		if (markerdata[6]*markerdata[8]/App.GetVariable("Beamcontrol.MetricBasicStepSize") >= 4080) //StepU
		{
			Markertypes[q][5] = Math.ceil((markerdata[6]/4080)/App.GetVariable("Beamcontrol.MetricBasicStepSize"))*App.GetVariable("Beamcontrol.MetricBasicStepSize");
		}
		else
		{
			Markertypes[q][5] = Math.ceil(App.GetVariable("Beamcontrol.MetricBasicStepSize")/(markerdata[8]*App.GetVariable("Beamcontrol.MetricBasicStepSize")))*App.GetVariable("Beamcontrol.MetricBasicStepSize");
		
		}
		if (markerdata[7]*markerdata[8]/App.GetVariable("Beamcontrol.MetricBasicStepSize") >= 4080) //StepV
		{
			Markertypes[q][6] = Math.ceil((markerdata[7]/4080)/App.GetVariable("Beamcontrol.MetricBasicStepSize"))*App.GetVariable("Beamcontrol.MetricBasicStepSize");
		}
		else
		{
			Markertypes[q][6] = Math.ceil(App.GetVariable("Beamcontrol.MetricBasicStepSize")/(markerdata[8]*App.GetVariable("Beamcontrol.MetricBasicStepSize")))*App.GetVariable("Beamcontrol.MetricBasicStepSize");
		}
		Markertypes[q][7] = markerdata[6]/Markertypes[q][5]; //PointsU
		Markertypes[q][8] = markerdata[7]/Markertypes[q][6]; //PointsV
		Markertypes[q][9] = Math.ceil(markerdata[5]*markerdata[3]*10)/10; //MarkOffsetU
		Markertypes[q][10] = Math.ceil(markerdata[5]*markerdata[4]*10)/10; //MarkOffsetV
		Markertypes[q][11] = Math.floor(Column.GetWriteField()/2 - Math.abs(markerdata[6] / 2) - Math.abs(Markertypes[q][9])); //MarkplaceU
		Markertypes[q][12] = Math.floor(Column.GetWriteField()/2 - Math.abs(markerdata[6] / 2) - Math.abs(Markertypes[q][10]));	//MarkplaceV
		Markertypes[q][13] = Math.ceil((markerdata[2]*1 - markerdata[9]*markerdata[2])*1000);//Profile min
		Markertypes[q][14] = Math.ceil((markerdata[2]*1 + markerdata[9]*markerdata[2])*1000);//Profile max
		Markertypes[q][15] = markerdata[10]; //ContrastLow
		Markertypes[q][16] = markerdata[11]; //ContrastHigh
		Markertypes[q][17] = "Mode:0,L1:" + Markertypes[q][15] + ",L2:" + Markertypes[q][16] + ",Profile:" + markerdata[12] + ",Min:" + Markertypes[q][13] + ",Max:" + Markertypes[q][14] + ",LFL:0,RFL:1,LNo:1,RNo:1,LeftE:0.5,RightE:0.5,DIS:0,ZL:0,ZR:0";//threshold
		Markertypes[q][18] = "0,0.000000,0.000000,0.000000,0.000000,0.000000," + Markertypes[q][1] + "," + Markertypes[q][2] + ",0.000000,LN,UV,Multisample WF align,STAY;,ALWF_AUTOLINE," + markerdata[6] + "," + markerdata[7] + "," + Markertypes[q][5] + "," + Markertypes[q][6] + ",U,16,,,,,,,,,,,,,,,,,,,,,,,0.0,15,0,1,";

		Markertypes[q][1] = Markertypes[q][1].toString();
		Markertypes[q][2] = Markertypes[q][2].toString();
		Markertypes[q][3] = (Math.abs(Markertypes[q][3])).toString();
		Markertypes[q][4] = (Math.abs(Markertypes[q][4])).toString();
		Markertypes[q][5] = Markertypes[q][5].toString();
		Markertypes[q][6] = Markertypes[q][6].toString();
		Markertypes[q][7] = Markertypes[q][7].toString();
		Markertypes[q][8] = Markertypes[q][8].toString();
		Markertypes[q][9] = Markertypes[q][9].toString();
		Markertypes[q][10] = Markertypes[q][10].toString();
		Markertypes[q][11] = Markertypes[q][11].toString();
		Markertypes[q][12] = Markertypes[q][12].toString();
		Markertypes[q][13] = Markertypes[q][13].toString();
		Markertypes[q][14] = Markertypes[q][14].toString();
		Markertypes[q][15] = Markertypes[q][15].toString();
		Markertypes[q][16] = Markertypes[q][16].toString();
		Markertypes[q][17] = Markertypes[q][17].toString();
		Markertypes[q][18] = Markertypes[q][18].toString();
		
	}
	return Markertypes;
}

function LoadWFAlignProcedures() 
{
	var loadlist, Alignprocedures, q, p, entries, markerstring;
	loadlist = GAlignprocedures.ReadString("LoadList", "load", "0").split(";");
	Alignprocedures = createArray(loadlist.length,20);

	for (q = 0; q < loadlist.length; q ++) 
	{
		entries = GAlignprocedures.ReadSection(loadlist[q]).split(",");
		if (entries[entries.length-2] != "log" || entries[entries.length-1] != "alwayswrite")
		{
    		App.ErrMsg(0,0,"Align procedure '" + loadlist[q] + "' not configured properly. Add 'log' and 'alwayswrite' switch to Alignprocedures.txt and restart script.");
    		Abort();			
		}
		Alignprocedures[q][0] = loadlist[q];
		Alignprocedures[q][1] = entries.length;
		for (p = 0; p < entries.length; p ++) 
		{
			Alignprocedures[q][p+2] = GAlignprocedures.ReadString(loadlist[q], entries[p], "undefined");
			if (p < entries.length-2)
			{
				markerarray = Alignprocedures[q][p+2].split(";");
				for (qp = 0; qp < markerarray.length; qp++)
				{
					markerloadlist = GMarkertypes.ReadString("LoadList", "load", "0").split(";");
					if (SearchArray(markerloadlist,markerarray[qp]) == -1)
					{
						App.ErrMsg(0,0,"Marker '" + markerarray [qp] + "' in alignprocedure " + loadlist[q] + " not found in Markers.txt" );
						Abort();
					}
				}
			}
			if (Alignprocedures[q][p+2] == "undefined") 
			{
    			App.ErrMsg(0,0,"Align procedure '" + loadlist[q] + "' not configured properly. Check Alignprocedures.txt and restart script.");
    			Abort();
			}
		}
	}
	return Alignprocedures;
}

function AutoWFAlign(markertype) //Aligns WF according to markertype, called from AlignWF
{
	var Markertypes, n, m, parlistname, parlist, multiini, multipls, PList, q, fmarkers;
	Markertypes = LoadMarkers();
	for (n = 0; n < Markertypes.length; n++)
	{
		if (Markertypes[n][0] == markertype) 
		{
			m = n;
			break;
		}
	}
  	
    parlistname = new Array("SizeU","SizeV","StepU","StepV","PointsU","PointsV","MarkOffsetU","MarkOffsetV","MarkPlaceU","MarkPlaceV");
	//parlist = new Array(SizeU,SizeV,StepU,StepV,PointsU,PointsV,MarkOffsetU,MarkOffsetV,MarkPlaceU,MarkPlaceV);
	parlist = new Array(Markertypes[m][3],Markertypes[m][4],Markertypes[m][5],Markertypes[m][6],Markertypes[m][7],Markertypes[m][8],Markertypes[m][9],Markertypes[m][10],Markertypes[m][11],Markertypes[m][12]);
	multiini = App.OpenIniFile(Glib + "Multisample WF align.ini");
	for (q = 0; q < parlist.length; q ++)  //Loop writes markerproperties to Multisample WF align.ini
	{	
		multiini.WriteString("Multisample WF align", parlistname[q], parlist[q]);
	}
	
	multipls = App.OpenIniFile(Glib + "Multisample WF align.pls");
	multipls.DeleteSection("DATA");
	multipls.WriteString("DATA", Markertypes[m][18], 0);

	InstallWFAlign(Markertypes[m][17]);
	PList = OpenPositionList(Glib + "Multisample WF align.pls");
	App.Exec("ScanAllPositions()");
	PList.Save();
	PList.Close();
	fmarkers = App.GetVariable("AlignWriteField.AutoMarksFailed");
	return(fmarkers);
}

function AlignWF(markprocedure, logWFflag, i, j, k) //Main function to start automatic WF alignment
{
	var WFAlignprocedures, m, n, a, b, c, d, entries, markers, amf, logfile, logstring, exposure;
  if (markprocedure != -1)
	{	
		WFAlignprocedures = LoadWFAlignProcedures();
		m = j + 1;
		n = k + 1;

		for (a = 0; a < WFAlignprocedures.length; a++) //Loop for selecting procedure using index 'b'.
		{
		
			if (WFAlignprocedures[a][0] == markprocedure) 
			{
				b = a;
				break;
			}
		}
		entries = WFAlignprocedures[b][1];
		//App.ErrMsg(0,0,WFAlignprocedures[b][engtries+1])
		for (c = 0; c < entries-2; c++)
		{
			markers = WFAlignprocedures[b][c+2].split(";");
			logstring = " ";

			for (d = 0; d < markers.length; d++)
			{
				amf = AutoWFAlign(markers[d]);
				logstring = logstring + markers[d] + " = " + amf + ", ";
				Panicbutton();
				if (amf == 0) break;
			}

			if (WFAlignprocedures[b][entries+1] == 1 && logWFflag == 1)
			{
				logfile = App.OpenInifile(Glogfilename[1] + Gprogressfilename);
				logfile.WriteString("Failed markers Sample " + i + " (" + S[8][4][i] + ")", "Markprocedure", markprocedure);
				logfile.WriteString("Failed markers Sample " + i + " (" + S[8][4][i] + ")", "Structure nx/ny[" + m + ";" + n + "] - Step " + Math.round(c+1) + ": ", logstring);
			}
		}
		if (WFAlignprocedures[b][entries+2] == 0 && amf >= 1) exposure = 0; //checks 'alwayswrite' and failed markers of last alignment and sets 'exopsure' accordingly
		else exposure = 1;
	}
	return[exposure, amf];	
}

function SetSvars(i, WFflag, msflag) //msflag?
{
	var ZoomX, ZoomY, ShiftX, ShiftY, RotX, RotY, corrZoomX, corrZoomY, corrShiftX, corrShiftY, corrRotX, corrRotY;

	if (parseFloat(S[1][5][i]) != parseFloat(Column.GetWriteField()))
	{
		Column.SetWriteField(S[1][5][i], true);	
	}
	ActivateColdata(S[2][5][i]);
	App.Exec("OpenDatabase(" + S[3][5][i] + ")");
	App.Exec("ViewStructure(" + S[4][5][i] + ")");
	App.Exec("SetWorkingArea(" + S[11][5][i] + ")");
	if (WFflag == 1)
	{
		App.Exec("GetCorrection()");
		ZoomX = App.GetVariable("Variables.ZoomX");
		ZoomY = App.GetVariable("Variables.ZoomY");
		ShiftX = App.GetVariable("Variables.ShiftX");
		ShiftY = App.GetVariable("Variables.ShiftY");
		RotX = App.GetVariable("Variables.RotX");
		RotY = App.GetVariable("Variables.RotY");

		corrZoomX = S[5][5][i] / ZoomX;
		corrZoomY = S[6][5][i] / ZoomY;
		corrShiftX = S[7][5][i] - ShiftX;
		corrShiftY = S[8][5][i] - ShiftY;
		corrRotX = S[9][5][i] - RotX;
		corrRotY = S[10][5][i] - RotY;

		App.Exec("SetCorrection(" + corrZoomX + ", " + corrZoomY + ", " + corrShiftX + ", " + corrShiftY + ", " + corrRotX + ", " + corrRotY + ")");	
	}
	if (msflag == 0)
	{
		StepsizeDwelltime(i,0,0); //GUIflag only 0 in setsvars function. Needed for exposureloops icw MS defined stepsizes.
		SetStepsizeDwelltime(i);	//bcflag should be one, beamcurrent should be set
	}
	
}

function WriteMatrix(S, i)
{
	var N, k, j;

	N = createArray(S[2][4][i]+1,S[3][4][i]+1,2);
	for (k = 0; k <= S[3][4][i]-1; k++)
	{
		for (j = 0; j <= S[2][4][i]-1; j++)
		{
		N[j+1][k+1][1] = parseFloat((j * S[4][4][i]) + S[6][4][i]);
		N[j+1][k+1][2] = parseFloat((k * S[5][4][i]) + S[7][4][i]);
		}
	}
	return(N);	
}

function Write(S, i, testmode, starttime) //S-matrix, n-th sample, type of writing (single,multiple..etc), testmode ornot
{
	var N, meander, k, j, mj, l61, l61exp, exposure, currentsampletime, awfvars;
	N = WriteMatrix(S, i);
	meander = 1;
	for (k = 0; k <= S[3][4][i]-1; k++)
	{
		for (j = 0; j <= S[2][4][i]-1; j++)
		{	
			if (isEven(k) == 0 && meander == 1)
			{
				mj = (S[2][4][i]-1)-j;
			}
			else
			{
				mj = j;
			}	
			currentsampletime = TimestampUTC(); //Timestamp for start current structure
			TimeandProgress(i, j, mj, k, starttime, currentsampletime, 1);
			Panicbutton();
			Stage.GlobalAlignment();
			Stage.DriveUV(N[mj+1][k+1][1], N[mj+1][k+1][2]);
			//Stage.W = 
			Stage.LocalAlignment();
			OriginCorrection();
			if (S[12][4][i] != -1) //Checks if layer 61 is enabled
			{
				l61 = S[12][4][i].split("-");
				CopyLog();
				if (S[13][4][i] == 1)
				{
					AlignWF(S[10][4][i], 1, i, mj, k);
				}	
				if (S[13][4][i] == 2 && k == 0 && j == 0)
				{	
					AlignWF(S[10][4][i], 1, i, mj, k);
				}	
				
				InstallGDSmarker(l61[0], k, mj);
				App.Exec("UnSelectAllExposedLayer()");                      //Deselects al exposed layers
				CopyLog();
				if (testmode == 1) 
				{
					if (l61[1] == 1)
					{
						App.Exec("SelectExposedLayer(61)");
					}
					else if (l61[1] == 2 && k == 0 && mj == 0)
					{
						App.Exec("SelectExposedLayer(61)");
					}
					else
					{
						App.Exec("UnSelectAllExposedLayer()"); 
					}
				}
				else 
				{
					if (l61[1] == 1)
					{
						l61exp = 61 + ";" + l61[2]; 
						App.Exec("SelectExposedLayer(" + l61exp + ")");	
					}
					else if (l61[1] == 2 && k == 0 && mj == 0)
					{
						l61exp = 61 + ";" + l61[2]; 
						App.Exec("SelectExposedLayer(" + l61exp + ")");	
					}
					else
					{
						l61exp = l61[2]; 
						App.Exec("SelectExposedLayer(" + l61exp + ")");	
					}				
				}
				App.Exec("Exposure");
				CopyLog();
				Panicbutton();
				RemoveGDSlogflag();
			}
			if (S[1][4][i] != -1) //Checks if a global layer is selected
			{
				CopyLog();
				if (S[13][4][i] == 1)
				{
					awfvars = AlignWF(S[10][4][i], 1, i, j, k); //align a writefield or not depending on S[10][4][i]
					exposure = awfvars[0];
				}	
				if (S[13][4][i] == 2 && k == 0 && j == 0)
				{	
					awfvars = AlignWF(S[10][4][i], 1, i, j, k); //align a writefield or not depending on S[10][4][i]
					exposure = awfvars[0];
				}
				if (S[13][4][i] == 3 || S[13][4][i] == 4) exposure = 1;							
				CopyLog();
				WFOverpattern(1);
				App.Exec("UnSelectAllExposedLayer()");                      //Deselects al exposed layers
				App.Exec("SelectExposedLayer(" + S[1][4][i] + ")");
				if (testmode != 1 && exposure == 1) App.Exec("Exposure");
				WFOverpattern(0);
				CopyLog();
				Panicbutton();
			}
			TimeandProgress(i, k, mj, j, starttime, currentsampletime, 0);		
		}
	}
	Stage.GlobalAlignment();
}

function WFOverpattern(instswitch)
{
	var ZoomX, ZoomY, ShiftX, ShiftY, RotX, RotY, corrZoomX, corrZoomY, corrShiftX, corrShiftY, corrRotX, corrRotY;

	App.Exec("GetCorrection()");
	ZoomX = App.GetVariable("Variables.ZoomX");
	ZoomY = App.GetVariable("Variables.ZoomY");
	ShiftX = App.GetVariable("Variables.ShiftX");
	ShiftY = App.GetVariable("Variables.ShiftY");
	RotX = App.GetVariable("Variables.RotX");
	RotY = App.GetVariable("Variables.RotY");
	if (instswitch == 1)
	{
		corrZoomX = ((S[8][6][i]/100)+1);
		corrZoomY = ((S[8][6][i]/100)+1);
	}
	else
	{
		corrZoomX = 1 / ((S[8][6][i]/100)+1);
		corrZoomY = 1 / ((S[8][6][i]/100)+1);		
	}
	corrShiftX = 0;
	corrShiftY = 0;
	corrRotX = 0;
	corrRotY = 0;

	App.Exec("SetCorrection(" + corrZoomX + ", " + corrZoomY + ", " + corrShiftX + ", " + corrShiftY + ", " + corrRotX + ", " + corrRotY + ")");
}

function FirstWFAlign()
{
    var wfprocedureloadlist, markprocedure;
    wfprocedureloadlist = GAlignprocedures.ReadString("LoadList", "load", "0").split(";");
    markprocedure = App.InputMsg("Select AutoWFAlign scan procedure", "Select: " + wfprocedureloadlist, wfprocedureloadlist[0]);
	AlignWF(markprocedure, 0, 1, 1, 1);
}

function GetColumnparam()
{
	var col = createArray(10,1);
	col[1][0] = parseFloat(Column.ApertureSize);
	col[2][0] = parseFloat(Column.ApertureX);
	col[3][0] = parseFloat(Column.ApertureY);
	col[4][0] = parseFloat(Column.StigmatorX);
	col[5][0] = parseFloat(Column.StigmatorY);
	col[6][0] = parseFloat(Column.Magnification);
	col[7][0] = parseInt(Column.HighTension);
	col[0][0] = col[7][0] + " kV; " + col[1][0] + " um aperture";
	col[0][0] = App.InputMsg("Choose name of column parameter set", "Enter name", col[0,0]);
	App.ErrMsg(0,0,col)
	SaveColumnparam(col)
}

function ActivateColdata(colset)
{
	var coldatfilepath, coldatini;
	coldatfilepath = Glib + "ColumnDataSets.txt";
	coldatini = App.OpenIniFile(coldatfilepath);
	if (coldatini.SectionExists(colset)==0)
	{
		App.ErrMsg(0,0,"Column name does not exist")
		Start();
	}
	else
	{
		var col = LoadColumnparam(colset)
		//if (float(col[1][0]) != 7.5)
		//App.ErrMsg(0,0,"activerendiehandel" + col)
		Column.ApertureSize = (col[1][0]);
		Column.ApertureX = (col[2][0]);
		Column.ApertureY = (col[3][0]);
		Column.StigmatorX = (col[4][0]);
		Column.StigmatorY = (col[5][0]);
		Column.Magnification = (col[6][0]);
		Column.HighTension = (col[7][0]);
		//Column.HighTension = 30;
	}

	// var multipls, PList, lastcolset;
	// lastcolset = LastDatasettoColset();
	// if (lastcolset != colset)
	// {
	// 	multipls = App.OpenIniFile(Glib + "ActivateColumnDataset.pls");
	// 	multipls.DeleteSection("DATA");
	// 	multipls.WriteString("DATA", "0,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,VN,UV,set ViCol mode entry,STAY,VICOL,,,,,,,,,,," + colset + ",106,,,,,,,,,,,,,,,,", 0);
	// 	PList = OpenPositionList(Glib + "ActivateColumnDataset.pls");
	// 	App.Exec("ScanAllPositions()");
	// 	PList.Save();
	// 	PList.Close();	
	// }
}

function LoadColumnparam(colset)
{
	var col = createArray(10,1);
	coldatfilepath = Glib + "ColumnDataSets.txt";
	coldatini = App.OpenIniFile(coldatfilepath);
	col[1][0] = coldatini.ReadFloat(colset, "Aperture", col[1][0]);
	col[2][0] = coldatini.ReadFloat(colset, "ApertureShiftX", col[2][0]);
	col[3][0] = coldatini.ReadFloat(colset, "ApertureShiftY", col[3][0]);
	col[4][0] = coldatini.ReadFloat(colset, "StigmatorShiftX", col[4][0]);
	col[5][0] = coldatini.ReadFloat(colset, "StigmatorShiftY", col[5][0]);
	col[6][0] = coldatini.ReadFloat(colset, "Magnification", col[6][0]);
	col[7][0] = coldatini.ReadFloat(colset, "HighTension", col[7][0]);
	//App.ErrMsg(0,0,"ladenlul"+ col)
	return(col)
}

function SaveColumnparam(col)
{
	coldatfilepath = Glib + "ColumnDataSets.txt";
	coldatini = App.OpenIniFile(coldatfilepath);
	coldatini.WriteString(col[0][0], "Aperture", col[1][0]);
	coldatini.WriteString(col[0][0], "ApertureShiftX", col[2][0]);
	coldatini.WriteString(col[0][0], "ApertureShiftY", col[3][0]);
	coldatini.WriteString(col[0][0], "StigmatorShiftX", col[4][0]);
	coldatini.WriteString(col[0][0], "StigmatorShiftY", col[5][0]);
	coldatini.WriteString(col[0][0], "Magnification", col[6][0]);
	coldatini.WriteString(col[0][0], "HighTension", col[7][0]);
}	



function Start()
{
	var GUIflag, beamoffflag, testmode, starttime;

	App.Exec("BeamOff()");
	Stage.GlobalAlignment();
    //LoadWFAlignProcedures();
	var switchvar = App.InputMsg("What are you up to? Select '1' to start normally,'2' to do ","rough WF alignment,'3' to grab UV/WF alignment., '4' to save or activate Column settings", "1")
	switch(parseInt(switchvar))
	{
		case 1:
			break;
		case 2:
			FirstWFAlign();
	   		Abort();
			break;
		case 3:
			GetUVWF();
			Abort();
			break;
		case 4:
			var switchvar2 = App.Inputmsg("Save or activate column settings","Select '1' to save current column, '2' to activate column form saved dataset","1")
				switch(parseInt(switchvar2))
		{
			case 1:
				GetColumnparam();
				Abort();
				break;
			case 2:
				colset = App.InputMsg("Select column dataset","Enter the name of the saved column dataset to activate:","x kV; y um aperture")
				ActivateColdata(colset);
				Abort()
				break;
			break;
		}
	}
	if (switchvar == "") Abort();

	var as = App.InputMsg("Select sample data source","Select '1' to collect sample data or select '2' to read 'Multisample.txt'.", "1");
	if (as!=1 && as!=2) Abort();  
	
	if (as == 1)
	{
		st = App.InputMsg("Select procedure","1: Single-settings Mode, 2: Per-sample-settings mode, 3: Load from SDvars.txt", "1");
		if (st!=1 && st!=2 && st!=3) Abort();  
		if (st == 1 || st == 2)	
		{
			GUIflag = App.InputMsg("Select data aquiring procedure","1: Easy automatic collection during UV alignment, 2: Manual collection using GUI","1");
			if (GUIflag == "") Abort();
			S = CollectSD(st, GUIflag);
		}
		else
		{
			Gnums = Detectnums(GSDini, "SDvars.txt", 1);
			Load(1);
		}

	}	
	else
	{
		Gnums = Detectnums(Gsampleini, "Multisample.txt", 1);
		Load(0);
	}
	Glogfilename = Logdata();
	beamoffflag = 0;

	if (App.Errmsg(EC_YESNO, 0 , "Run in test mode? (No exposure)") == EA_YES)
	{
		testmode = 1;
		//if (App.Errmsg(EC_YESNO, 0 , "Overwrite Multisample.txt with logfile for easy loading of paramters?") == EA_YES)
		//{
		//	App.ErrMsg(0,0,"Function not yet implemented")
		//}
	}
	else
	{
		if (App.Errmsg(EC_YESNO, 0 , "Turn off EHT and drive to upper exchange position after writing?") == EA_YES) beamoffflag = 1;
		testmode = 0;
	}
	
	
	if (App.ErrMsg(EC_YESNO,0,"Writing now commences.") == EA_NO)
	{
		Abort();
	}
	starttime = TimestampUTC();
	for (i = 1; i<= Gnums; i++)
	{
		Panicbutton();
		AlignUV(i);
		SetSvars(i, 1, 0);
		Write(S, i, testmode, starttime);
    }
    if (beamoffflag == 1)                                                //5 lines: Turn off beam if option has been set.
    {
		Column.HTOnOff = false;
		App.ProtocolEvent(30, 0, 0, "Beam shutdown.");
		//Stage.X = 72.868;	//Needs new values for Elphy 											//Sets stage coörds to 30,30 (saves time when driving back)
		//Stage.Y = -8.166;
		//Stage.Z = 10.5;
    }
    else
    {
    	//Stage.X = -39.0; 	//Needs new values for Elpy										//Sets stage coörds to 30,30 (saves time when driving back)
		//Stage.Y = 35.0;
    }
}

Install(0);
ResetPanicbutton();
Start();
Succes(beamoffflag);