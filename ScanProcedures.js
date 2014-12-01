function AlignWF(markprocedure, logWFflag, i, j, k)
{
	var m, n, amf1, amf2, logfile, logstring;

	m = j + 1;
	n = k + 1;
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
					amf1[3] = AutoWFAlign(13);
				}
				if (logWFflag == 1)
				{
					logfile = App.OpenInifile(Glogfilename[1] + Glogfilename[2]);
					logfile.WriteString("Failed markers S" + i,"Markprocedure", "Photomarkers");
					logstring = "Mark1=" + amf1[1] + ", Mark2 =" + amf1[2] + ", Mark3 =" + amf1[3];
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
					amf1[3] = AutoWFAlign(13);
				}
				if (logWFflag == 1)
				{
					logfile = App.OpenInifile(Glogfilename[1] + Glogfilename[2]);
					logfile.WriteString("Failed markers S" + i,"Markprocedure", "Photo + EBL markers");
					logstring = "Mark1=" + amf1[1] + ", Mark2 =" + amf1[2] + ", Mark3 =" + amf1[3];
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
					amf2[3] = AutoWFAlign(23);
				}
				if (logWFflag == 1)
				{
					logfile = App.OpenInifile(Glogfilename[1] + Glogfilename[2]);
					logfile.WriteString("Failed markers S" + i,"Markprocedure", "Photo + EBL markers");
					logstring = "Mark1=" + amf2[1] + ", Mark2 =" + amf2[2] + ", Mark3 =" + amf2[3];
					logfile.WriteString("Failed markers S" + i,"D" + m + ";" + n + " (EBL markers)", logstring);
				}
				Panicbutton();
				break; 
		// only do a writefield alignment on the very first device
		case 3:	if ((j === 0) && (k === 0)) 
				{
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
						amf1[3] = AutoWFAlign(13);
					}
					if (logWFflag == 1)
					{
						logfile = App.OpenInifile(Glogfilename[1] + Glogfilename[2]);
						logfile.WriteString("Failed markers S" + i,"Markprocedure", "Photo + EBL markers");
						logstring = "Mark1=" + amf1[1] + ", Mark2 =" + amf1[2] + ", Mark3 =" + amf1[3];
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
						amf2[3] = AutoWFAlign(23);
					}
					if (logWFflag == 1)
					{
						logfile = App.OpenInifile(Glogfilename[1] + Glogfilename[2]);
						logfile.WriteString("Failed markers S" + i,"Markprocedure", "Photo + EBL markers");
						logstring = "Mark1=" + amf2[1] + ", Mark2 =" + amf2[2] + ", Mark3 =" + amf2[3];
						logfile.WriteString("Failed markers S" + i,"D" + m + ";" + n + " (EBL markers)", logstring);
					}
				}
				Panicbutton();
				break;
		case 4: break; 		
		}
}