

/**
 * Template Scanner Configuration.
 * 
 * Boilerplate code for all Scanner Configurations.
 * 
 * Consolidation Block included.
 */


// holds the previous scan result
var previousScan = [""];
// used to hold comparison of previous and current scan result
var inLastRead = true;
// used to hold 1 or 2 partial label scan results for consolidation
var partialLabelScans = ["", ""]


/** 
 * This method is invoked on a successful code read.
 * @param decodeResults - Array of results and scan information produced by the scanner.
 * @param readerProperties - Array of Scanner Properties.
 * @param output - Array allowing customization of the output behavior of the Scanner.
 **/ 
function onResult(decodeResults, readerProperties, output) {
	// if the result was successfully decoded
	if (decodeResults[0].decoded) {
        // save the raw results
        var rawResults = decodeResults[0].content;
        // check the code output against the previously scanned code(s)
        inLastRead = isStringInArray(previousScan, rawResults);
        if (!inLastRead) {
            // shift out the previous scan and add the new scan into the list
            previousScan.shift();
            previousScan.push(rawResults);
            // process the initial results
            var processedResults = processResultString(rawResults);
            // perform partial checks
            var checkResults = checkAndProcessPartialLabel(processedResults, partialLabelScans, decodeResults, output, previousScan);
            // if the label was partial, use the output module from the method
            if (checkResults[0]) {
                previousScan = checkResults[1];
                output = checkResults[2];
            } else {
                // verify correct previous process (1st field on QR Code)
                /** Enter previous process here */
                var previousProcess = "4420 - Diecast";
                if (!processedResults[0] == previousProcess) {
                    var error = dataValidationError(decodeResults, output, previousScan, "Invalid Label. Please scan a <previousProcess> Label.");
                    previousScan = error[0];
                    output = error[1];
                }
                /**
                 * 
                 * 
                 * 
                 * 
                 * Add additional scan result validation conditions here.
                 * Call the dataValidationError() method if any condition fails.
                 * 
                 * 
                 * 
                 * 
                 */
                // generate a final output string, send it to the output module, and show a message on the screen
                var finalOutput = generateOutputString(readerProperties, processedResults);
                output.content = finalOutput;
                output.OLED = "<Message>";
            }
        // the code scanned matches the previously scanned code
        } else {
            output = duplicateScanError(output);
        }
    // results do not pass the validations
    } else {
        var error = dataValidationError(decodeResults, output, previousScan);
        previousScan = error[0];
        output = error[1];
    }
}


/**
 * PARTIAL|4420-Diecast|00-T20-532AP-A000-YB1\nHOUSING, PIVOT*|200|20|1|3/3/2025-16:01:36|1|MBR 
 * 4420-Diecast|00-T20-532AP-A000-YB1\nHOUSING, PIVOT*|264|018|1|3/3/2025-15:45:50|1|MBR 
 * 
 * PARTIAL|1
 */

/**
 * Consolidates two PARTIAL labels into a singular, paired PARTIAL label. 
 * Draws static (matching) field values from the second partial label.
 * @param {string} partialLabel1 the first (earlier) partial label to consolidate FROM.
 * @param {string} partialLabel2 the second (later) partial label to consolidate TO.
 * @returns {string | null} Consolidated Partial Label string; null if serial numbers do not match.
 */
function consolidatePartialLabels(partialLabel1, partialLabel2) {
    // confirm matching serial numbers
    var matching = checkMatchingSerialNumbers(partialLabel1, partialLabel2);
    if (!matching) {
        return null;
    }
    // retrieve the quantity, shift, and operator information from each Split Label
    var quantity1 = splitLabel1.splice(3, 1);
    var quantity2 = splitLabel2.splice(3, 1);
    var shift1 = splitLabel1.splice(splitLabel1.length - 3, 1);
    var shift2 = splitLabel2.splice(splitLabel2.length - 3, 1);
    var operator1 = splitLabel1.splice(splitLabel1.length - 1, 1);
    var operator2 = splitLabel2.splice(splitLabel2.length - 1, 1);
    // combine the two sets of info into formatted pairs
    var quantityPair = quantity1 + ":" + quantity2;
    var shiftPair = shift1 + ":" + shift2;
    var operatorPair = operator1 + ":" + operator2;
    // remove the PARTIAL flag from the list of fields
    splitLabel2.splice(0, 1)
    // create a new PARTIAL label string with the paired/existing label info
    // add the first 5 mandatory fields (partial|process|part|quantity|serial number)
    var partialLabelFront = "PARTIAL|" +                        // partial flag
                            splitLabel2.splice(0, 1) + "|" +    // process title
                            splitLabel2.splice(0, 1) + "|" +    // part number/name
                            quantityPair + "|" +                // paired quantities 
                            splitLabel2.splice(0, 1) + "|";     // serial number (jbk/lot)
    // create the back-end of the partial label string (date|shift|operator)
    // uses the second (more recent) partial label date
    var partialLabelBack = splitLabel2.splice(splitLabel2.length - 1, 1) + "|" +
                           shiftPair + "|" +
                           operatorPair;
    // create a mid-section to capture any process-dependent fields (whatever is remaining in the splitLabel2 string)
    var partialLabelInner = ""
    while (splitLabel2.length > 0) {
        // add the field to the inner segment
        partialLabelInner += splitLabel2.splice(0, 1) + "|";
    }
    // combine the front, inner, and back segments into a full partial label string
    var consolidatedPartialLabel = partialLabelFront + partialLabelInner + partialLabelBack;
    return consolidatedPartialLabel;
}


function consolidateWithFullLabel(partialLabel, fullLabel) {

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
function isStringInArray(array, string) {
	for (var i = 0; i < array.length; i++) {
		if (array[i] === string) {
			return true;
		}
	}
	return false;
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
    // add the Scan date/time to the output
    var outputString = formattedDate;
    // add the processed Scan results to the output
    for (var i = 0; i < processedResultList.length; i++) {
        outputString += "," + String(processedResultList[i]);
    }
    // add a newline character to the end of the output
    outputString += "\n"
    return outputString;
}

/**
 * Compares the serial numbers of two Partial Labels.
 * @param {string} partialLabel1 the first (earlier) partial label to consolidate FROM.
 * @param {string} partialLabel2 the second (later) partial label to consolidate TO.
 * @returns `true` on match; `false` on mismatch.
 */
function checkMatchingSerialNumbers(partialLabel1, partialLabel2) {
    // split the labels by the bar symbol delimiter
    var splitLabel1 = partialLabel1.split("|");
    var splitLabel2 = partialLabel2.split("|");
    // verify that the two Labels have a matching serial number in position 4 (5th field)
    return (splitLabel1[4] == splitLabel2[4]);
}

/**
 * Checks if a scan result is a Partial Label and processes it if so.
 * @param {string[]} processedResults a processed scan result from `processResultString()`.
 * @param {string[]} partialLabelScans the `partialLabelScans` store.
 * @param {*} decodeResults - The `decodeResults` produced by the Scanner.
 * @param {*} output - The `output` module created by the Scanner.
 * @param {*} previousScan - The `previousScan` array initialized in the beginning of the script.
 * @returns {[boolean, *, *]} `boolean` (is Partial?), `previousScan` store, and modified `output` module.
 */
function checkAndProcessPartialLabel(processedResults, partialLabelScans, decodeResults, output, previousScan) {
    // check if the results are from a Partial Label
    var rawResults = decodeResults[0].content;
    var isPartial = false;
    if (processedResults[0] == "PARTIAL") {
        isPartial = true;
        // add the RAW scan result to the partial scans store
        if (partialLabelScans[0] == "") {
            partialLabelScans[0] = rawResults;
            // send first partial message
            output.OLED = "First Partial Label stored for Consolidation.";
            // output nothing
            output.content = "";
        // there is already at least one partial label scan stored
        } else if (partialLabelScans[1] == "") {
            // if the first and second scans match, throw duplicate scan error
            if (partialLabelScans[0] == rawResults) {
                output = duplicateScanError(output);
            // the new scan is not a duplicate; verify matching serial numbers
            } else {
                var matching = checkMatchingSerialNumbers(partialLabelScans[0], rawResults);
                // the serial numbers match; store this second scan
                if (matching) {
                    partialLabelScans[1] = rawResults;
                    // send second partial message
                    output.OLED = "Second Partial Label stored for Consolidation.";
                    // output nothing
                    output.content = "";
                // the partial label serial numbers do not match; throw consolidation error
                } else {
                    var error = consolidationError(decodeResults, output, previousScan, "This Partial Label is for a different Basket. Please consolidate to a Full Label before scanning another Partial Label.");
                    previousScan = error[0];
                    output = error[1];
                }
            }
        // the partial label scans store is full (2 labels already scanned); cannot consolidate more partials
        } else {
            var error = consolidationError(decodeResults, output, previousScan, "Two Partial Labels have already been scanned. Please consolidate to a Full Label.");
            previousScan = error[0];
            output = error[1];
        }
    }
    return [isPartial, previousScan, output];
}

/**
 * Throws a duplicate scan error to the Scanner. 
 * Sends a data validation failure command, sends a warning to the screen, and voids output.
 * @param {Array} output - The output module generated by the Scanner.
 * @returns {*} a modified output module to call from.
 */
function duplicateScanError(output) {
    dmccCommand("OUTPUT.DATAVALID-FAIL");
    output.OLED = "Duplicate Label scanned";
    output.content = "";
    return output;
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
function dataValidationError(rawResults, output, previousScan, message = "<DataValidationErrorMessage>") {
    dmccCommand("OUTPUT.DATAVALID-FAIL");
    output.OLED = message;
    output.content = "";
    // update the last scan
    previousScan.shift();
    previousScan.push(rawResults);
    return [previousScan, output];
}

/**
 * Throws a consolidation error to the Scanner.
 * Sends a data validation command, sends a warning to the screen, and voids output.
 * Additionally, shifts `previousScan` to the `decodeResults` content.
 * Returns the new `previousScan` array
 * @param {*} decodeResults - The `decodeResults` produced by the Scanner.
 * @param {*} output - The `output` module created by the Scanner.
 * @param {*} previousScan - The `previousScan` array initialized in the beginning of the script.
 * @param {string} message - An optional message to show instead of the default Data Validation failure message.
 * @returns {string[]}
 */
function consolidationError(rawResults, output, previousScan, message = "<ConsolidationErrorMessage>") {
    dmccCommand("OUTPUT.DATAVALID-FAIL");
    output.OLED = message;
    output.content = "";
    // update the last scan
    previousScan.shift();
    previousScan.push(rawResults);
    return [previousScan, output];
}