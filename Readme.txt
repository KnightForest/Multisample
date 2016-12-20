Multisample is a versatile tool for mix and match electron-beam lithography writing on the RAITH-150(TWO). In addition to the standard software it adds the following main features:

- Sample batching, including their aligment properties
- Automated writefield alignment
- Fully customisabe alignment marker database and alignment procedures
- Complete sample set-up wizard 
- On-the-fly saving, modifying and reloading of all sample parameters
- Automated beam-switching
- Improved beam current measurement procedure
- Extensive logging including time prediction

[Installation]
1. Copy the folder 'Multisample' into your RAITH istallation folder under scripts. Most likely in:
   C:\RAITH150-TWO\User\{yourusername}\Scripts\
2. Create a link to Multisample.js in the automation tab in the RAITH software.

[Files for user input]
1. 'Panic.txt': Change the value for 'panic' to any value except '0' to interrupt during execution.
2. 'Markers.txt': Define properties of markers located on your sample(s). Read extended documentation 
   for more information.
3. 'Alignprocedures.txt': Define procedures for writefield alignment using the markers defined in
   'Markers.txt'.
4. Logs: Afer every alignment and/or writing session, a logfile is produced which can be found in the
   'Logs' folder. These data are readily formatted to be loaded for a new writing session using 
   'Multisample.txt'. This way, if someone goes wrong before or during writing, the samplealignment
   and other settings are not lost.
5. (Optional) 'Multisample.txt': You can use this file to load all sample settings for the currently 
   loaded samples. This is used for copying a log file when the script is aborted. Writing properties 
   and attributes can now be manually changed before loading again.
6. (Optional) 'SDvars.txt': This file can be used in the same way as 'Multisample.txt'. I contains all
   writing properties except the UV and writefield alignment. This way, all settings that do not require
   a loaded sample can be defined beforehand.

Refer to 'Manual.rtf' for more extensive documentation