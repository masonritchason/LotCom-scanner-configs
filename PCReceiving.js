
// Script for PC-RECEIVING scanners
// Programmed to accept QR Codes with the following conditions:
// 5 fields of Data:
// 1: PO Number
	// PO Number must be a string of digits, alphabetical characters, and the '-' (dash) and '_' (underscore) characters.
// 2: Part Number
	// Part Number must be in one of the acceptable, declared Part Number formats;
	// Part Number must be in the list of accepted Part Numbers for this Scanner Configuration.
// 3: Part Name
	// Part Name must be a string of digits, alphabetical characters, spaces, and the '-' (dash), ',' (comma), and '_' (underscore) characters;
	// Commas in this field will be replaced by ';' (semi-colon).
// 4: Quantity
	// Quantity must be a string of strictly digits, with no whitespace characters.
// 5: JBK Number
	// JBK Number must be a 3-length string of strictly digits, with no whitespace characters.
// No fields other than the Part Name may contain ',' (comma) and each field must be delimited by '|' (bar) per the QR Code standard. No field may be empty.

// initialize variables
// holds the previous scan result; prevents the scanner from reading the same code multiple times
var lastResults = [""];
// used to hold the validation state of the result
var validationState = false;

// executes on a successful read
function onResult(decodeResults, readerProperties, output) {
	// if the result was successfully decoded
	if (decodeResults[0].decoded) {
		// replace any occurences of the character "|" with ","
		var processedResults = decodeResults[0].content.replace(/\|/g, ",");
		// remove all spaces from the results
		processedResults = processedResults.replace(/\s/g, "");
		// save a split version of the results
		var splitResults = processedResults.split(",");
		// set a regex pattern for ONLY digits (PO Number format)
		var poPattern = /^\d+$/;
		// test the pattern match on the first field of the results
		if (!poPattern.test(splitResults[0])) {
			// set the validation state to false
			validationState = false;
		} else {
			// set the validation state to true
			validationState = true;
		}
		// if the validation was passed 
		if (validationState) {
			// check the code output against the previously scanned code(s)
			notInLastRead = isStringNotInArray(lastResults, decodeResults[0].content);
			// if not the last code read, remove first string from array and add new code to the end
			if (notInLastRead) {
				lastResults.shift();
				lastResults.push(decodeResults[0].content);
                // send a message to the screen
                dmccCommand("UI.SEND-ALERT", 10, 0, "Label Received");
				// add the scanner information to the output
				// scanner_name, date/time, results
				output.content = "\n" + readerProperties.name + "," + 
					readerProperties.trigger.creationDate + "," + 
					processedResults;
			// if the codes match, output nothing
			} else {
				output.content = "";
			}
		} else {
            // results do not pass the validation
			// throw data validation failure event
			dmccCommand("OUTPUT.DATAVALID-FAIL");
			dmccCommand("UI.SEND-ALERT", 10, 1, "Invalid Label Scanned");
			// output nothing
			output.content = "";
		}
	}
}

// Checks the passed Array for the passed String
function isStringNotInArray(array, string) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] === string) {
      return false;
    }
  }
  return true;
}