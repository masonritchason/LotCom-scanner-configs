

/**
 * Deburr Scanner Configuration.
 */


// holds the previous scan result
var previousScan = [""];
// used to hold comparison of previous and current scan result
var notInLastRead = false;


/** 
 * This method is invoked on a successful code read.
 * @param decodeResults - Array of results and scan information produced by the scanner.
 * @param readerProperties - Array of Scanner Properties.
 * @param output - Array allowing customization of the output behavior of the Scanner.
 **/ 
function onResult(decodeResults, readerProperties, output) {
	// if the result was successfully decoded
	if (decodeResults[0].decoded) {
        // process the initial results ('|' -> ',' and remove all spaces)
		var processedResults = processResultString(decodeResults[0].content);
        // check the code output against the previously scanned code(s)
        notInLastRead = isStringNotInArray(previousScan, decodeResults[0].content);
        if (notInLastRead) {
            // shift out the previous scan and add the new scan into the list
            previousScan.shift();
            previousScan.push(decodeResults[0].content);
            // verify correct amount of fields in code (change codeFieldCount to the number of fields you need)
            var codeFieldCount = 7;
            if (!processedResults.length == codeFieldCount) {
                previousScan, output = dataValidationError(decodeResults, output, previousScan, "Invalid Label. Please scan a Diecast Label.");
            }
            // validate each field required for a Diecast Label to be captured
            if (!validatePartNumber(processedResults[0])) {
                previousScan, output = dataValidationError(decodeResults, output, previousScan, "Invalid Diecast Label or Invalid Part Number.");
            } else if (!validateDieNumber(processedResults[2])) {
                previousScan, output = dataValidationError(decodeResults, output, previousScan, "Invalid Diecast Label or Invalid Die Number.");
            } else if (!validateQuantity(processedResults[3])) {
                previousScan, output = dataValidationError(decodeResults, output, previousScan, "Invalid Diecast Label or Invalid Quantity.");
            } else if (!validateDateNoTime(processedResults[4])) {
                previousScan, output = dataValidationError(decodeResults, output, previousScan, "Invalid Diecast Label or Invalid Date.");
            } else if (!validateShiftNumber(processedResults[5])) {
                previousScan, output = dataValidationError(decodeResults, output, previousScan, "Invalid Diecast Label or Invalid Shift Number.");
            } else if (!validateJBKNumber(processedResults[6])) {
                previousScan, output = dataValidationError(decodeResults, output, previousScan, "Invalid Diecast Label or Invalid JBK Number.");
            } else {
                // generate a final output string, send it to the output module, and show a message on the screen
                var finalOutput = generateOutputString(readerProperties, processedResults);
                output.content = finalOutput;
                output.OLED = "Diecast Label captured successfully.";
            }
        // the code scanned matches the previously scanned code
        } else {
            duplicateScanError(output);
        }
    // results do not pass the validations
    } else {
        previousScan, output = dataValidationError(decodeResults, output, previousScan);
    }
}


/**
 * Helper Methods
 */


/**
 * Checks the passed Array for the passed String.
 * @param {string[]} array - The array to search in.
 * @param {String} string - The string to search `array` for.
 * @returns {boolean}
 */
function isStringNotInArray(array, string) {
	for (var i = 0; i < array.length; i++) {
		if (array[i] === string) {
			return false;
		}
	}
	return true;
}

/**
 * Processes a result string to remove spaces and replace bars with commas.
 * @param raw - The raw result string from the scanner output.
 * @returns {string[]}
 **/
function processResultString(raw) {
	// ensure the input is a string
	var input_string = String(raw);
    // split the string into an array by the bar symbol
    var input_list = input_string.split("|");
    // remove whitespace, comma, ampersand, and newline characters from each field
    for (var i = 0; i < input_list.length; i++) {
        _string = input_list[i];
        _string = _string.replace(/\s/g, "");
        _string = _string.replace(/\\000026/g, "");
        _string = _string.replace(/\n/g, "");
        _string = _string.replace(",", "")
        input_list[i] = _string;
    }
	// return the processed result array
	return input_list;
}

/**
 * Creates a final, formatted string that can be sent to the output module.
 * @param {Array} readerProperties - The `readerProperties` item created by the Scanner.
 * @param {string[]} processedResultList - The list of processed fields created by `processResultString()`
 * @returns {null}
 */
function generateOutputString(readerProperties, processedResultList) {
    // create a month name -> number conversion dictionary
    var monthConversions = {
        "Jan": "01",
        "Feb": "02",
        "Mar": "03",
        "Apr": "04",
        "May": "05",
        "Jun": "06",
        "Jul": "07",
        "Aug": "08",
        "Sep": "09",
        "Oct": "10",
        "Nov": "11",
        "Dec": "12"
    }
    // get the raw scan date/time information from the Scanner
    var unformattedDate = String(readerProperties.trigger.creationDate).split(" ");
    // remove the weekday ([0]) and the timezone information ([5-end])
    unformattedDate = unformattedDate.slice(1, 5)
    // convert the month from name to number
    unformattedDate[0] = monthConversions[unformattedDate[0]]
    // format the month, day, and year into a date string of format MM/DD/YYYY
    var formattedDate = unformattedDate[0] + "/" + unformattedDate[1] + "/" + unformattedDate[2]
    // add the timestamp
    formattedDate += "-" + unformattedDate[3]
    // add the Scanner name to the output
    var outputString = String(readerProperties.name);
    // add the Scan date/time to the output
    outputString += "," + formattedDate;
    // add the processed Scan results to the output
    for (var i = 0; i < processedResultList.length; i++) {
        outputString += "," + String(processedResultList[i]);
    }
    // add a newline character to the end of the output
    outputString += "\n"
    return outputString;
}

/**
 * Throws a duplicate scan error to the Scanner. 
 * Sends a data validation failure command, sends a warning to the screen, and voids output.
 * @param {Array} output - The output module generated by the Scanner.
 * @returns {null}
 */
function duplicateScanError(output) {
    dmccCommand("OUTPUT.DATAVALID-FAIL");
    output.OLED = "Duplicate Label scanned";
    output.content = "";
}

/**
 * Throws a data validation error to the Scanner.
 * Sends a data validation failure command, sends a warning to the screen, and voids output.
 * Additionally, shifts `previousScan` to the `decodeResults` content. 
 * Returns the new `previousScan` array.
 * @param {*} decodeResults - The `decodeResults` produced by the Scanner.
 * @param {*} output - The `output` module created by the Scanner.
 * @param {*} previousScan - The `previousScan` array initialized in the beginning of the script.
 * @param {string} message - An optional message to show instead of the default Data Validation failure message.
 * @returns {string[]}
 */
function dataValidationError(decodeResults, output, previousScan, message = "Invalid Label. Please scan a Diecast Label.") {
    dmccCommand("OUTPUT.DATAVALID-FAIL");
    output.OLED = message;
    output.content = "";
    // update the last scan
    previousScan.shift();
    previousScan.push(decodeResults[0].content);
    return previousScan, output
}


/**
 * Format Validator Methods.
 * 
 * Call each to validate the needed fields for each Label type.
 * 
 * Remove unused methods to avoid loading useless script onto the Scanner.
 */


/**
 * Validates a string as a Part Number using a regular expression test.
 * @param {string} string 
 * @returns {boolean}
 */
function validatePartNumber(string) {
	// set regex pattern for Part Numbers
	var pnPattern1 = /^[a-zA-Z0-9]+\-[a-zA-Z0-9]+\-[a-zA-Z0-9]+$/;
	var pnPattern2 = /^[a-zA-Z0-9]+\-[a-zA-Z0-9]+\-[a-zA-Z0-9]+\-[a-zA-Z0-9]+$/;
	var pnPattern3 = /^[a-zA-Z0-9]+\-[a-zA-Z0-9]+\-[a-zA-Z0-9]+\-[a-zA-Z0-9]+\-[a-zA-Z0-9]+$/;
	// check for each of the defined part number formats
	if (pnPattern1.test(string)) {
		return true;	
	}
	if (pnPattern2.test(string)) {
		return true;	
	}
	if (pnPattern3.test(string)) {
		return true;	
	}
	// none of the checks were successful
	return false;
}

/**
 * Validates a string as a Date (without a timestamp) using a regular expression test.
 * @param {string} string 
 * @returns {boolean}
 */
function validateDateNoTime(string) {
    // set a regex pattern for Date format
    var datePattern = /^\d?\d\/\d?\d\/\d\d\d\d$/;
	if (datePattern.test(string)) {
		return true;	
	} else {
        return false;
    }
}

/**
 * Validates a string as a Shift Number.
 * @param {string} string 
 * @returns {boolean}
 */
function validateShiftNumber(string) {
    // check that the string is 1, 2, or 3
    if (string == "1" || string == "2" || string == "3") {
        return true;
    } else {
        return false;
    }
}

/**
 * Validates a string as a JBK Number. Enforces three-length format; returns the string in this format.
 * @param {string} string 
 * @returns {boolean | Array}
 */
function validateJBKNumber(string) {
    // set a regex pattern for JBK numbers
    var jbkPattern = /^[\d]?[\d]?[\d]$/;
    if (jbkPattern.test(string)) {
        // ensure JBK is three digits by adding 0s
        while (string.length < 3) {
            string = "0" + string;
        }
		return [true, string];	
	} else {
        return false;
    }
}

/**
 * Validates a string as a Quantity.
 * @param {string} string 
 * @returns {boolean}
 */
function validateQuantity(string) {
    // set a regex pattern for Quantities
    var quantityPattern = /^\d+$/;
    if (quantityPattern.test(string)) {
		return true;	
	} else {
        return false;
    }
}

/**
 * Validates a string as a Die Number.
 * @param {string} string 
 * @returns {boolean}
 */
function validateDieNumber(string) {
    // set a regex pattern for Die Numbers
    var diePattern = /^\d?\d?\d$/;
    if (diePattern.test(string)) {
		return true;	
	} else {
        return false;
    }
}