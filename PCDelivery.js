
// Script for PC-DELIVERY scanners
// Limited to reading QR Codes that begin with a PART Number

// initialize variables
// holds the previous scan result
var lastResults = [""];
// used to hold comparison of previous and current scan result
// var notInLastRead = false;
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
		// set a regex pattern for Part Number format 1
		var pnPattern1 = /^\w\w-\w\w\w-\w\w\w\w\w-\w\w\w\w$/;
		// set a regex pattern for Part Number format 2
		var pnPattern2 = /^\w\w-\w\w\w-\w\w\w\w\w-\w\w\w\w-\w\w\w$/;
		// test the first pattern match on the first field of the results
		if (!pnPattern1.test(splitResults[0])) {
			// test the second pattern match on the first field of the results
			if (!pnPattern2.test(splitResults[0])) {
				// set the validation state to false
				validationState = false;
			} else {
				// set the validation state to true
				validationState = true;
			}
		} else {
			// set the validation state to true
			validationState = true;
		}
		// if the validation was passed 
		if (validationState) {
			// check the code output against the previously scanned code(s)
			// notInLastRead = isStringNotInArray(lastResults, decodeResults[0].content);
			// if not the last code read, remove first string from array and add new code to the end
			// if (notInLastRead) {
			//	lastResults.shift();
			//	lastResults.push(decodeResults[0].content);
                // send a message to the screen
                dmccCommand("UI.SEND-ALERT", 10, 0, "Label Delivered");
				// add the scanner information to the output
				// scanner_name, date/time, results
				output.content = "\n" + readerProperties.name + "," + 
					readerProperties.trigger.creationDate + "," + 
					processedResults;
			// if the codes match, output "Already Read"
			// } else {
			//	output.content = "\nAlready Read";
			// }
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