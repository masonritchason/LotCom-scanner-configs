

/**
 * Template Scanner Configuration.
 * 
 * Boilerplate code for all Scanner Configurations.
 * 
 * Consolidation Block included.
 */


// holds the previous scan result
var previousScanStore = [""];
// used to hold comparison of previous and current scan result
var inLastRead = true;
// used to hold 1 or 2 partial label scan results for consolidation
var partialScanStore = ["", ""]


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
        inLastRead = isStringInArray(previousScanStore, rawResults);
        if (!inLastRead) {
            // shift out the previous scan and add the new scan into the list
            previousScanStore.shift();
            previousScanStore.push(rawResults);
            // process the initial results
            var processedResults = processResultString(rawResults);
            // perform partial checks
            var checkResults = checkAndProcessPartialLabel(processedResults, partialScanStore, decodeResults, output, previousScanStore);
            // if the label was partial, use the output module from the method
            if (checkResults[0]) {
                previousScanStore = checkResults[1];
                output = checkResults[2];
            } else {
                // verify correct previous process (1st field on QR Code)
                /** Enter previous process here */
                var previousProcess = "4420 - Diecast";
                if (!processedResults[0] == previousProcess) {
                    var error = dataValidationError(decodeResults, output, previousScanStore, "Invalid Label. Please scan a <previousProcess> Label.");
                    previousScanStore = error[0];
                    output = error[1];
                }
                // full label scanned; check for and perform any consolidations
                var consolidationResults = consolidateLabels(partialScanStore, rawResults, output, previousScanStore);
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
        var error = dataValidationError(decodeResults, output, previousScanStore);
        previousScanStore = error[0];
        output = error[1];
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
 * Consolidation Methods
 */


/**
 * Compares the serial numbers of two Partial Labels.
 * @param {string} partialLabel1 the first (earlier) partial label to consolidate FROM.
 * @param {string} partialLabel2 the second (later) partial label to consolidate TO.
 * @returns {boolean} `true` on match; `false` on mismatch.
 */
function checkPartialSerialNumbers(partialLabel1, partialLabel2) {
    // split the labels by the bar symbol delimiter
    var splitLabel1 = partialLabel1.split("|");
    var splitLabel2 = partialLabel2.split("|");
    // verify that the two Labels have a matching serial number in position 4 (5th field)
    return (splitLabel1[4] == splitLabel2[4]);
}

/**
 * Compares the serial numbers of a Partial Label and Full Label.
 * @param {string} partialLabel 
 * @param {string} fullLabel 
 * @returns {boolean} `true` on match; `false` on mismatch.
 */
function checkFullSerialNumbers(partialLabel, fullLabel) {
    // split the labels by the bar symbol delimiter
    var splitPartialLabel = partialLabel.split("|");
    var splitFullLabel = fullLabel.split("|");
    // verify that the two Labels have a matching serial number (position 4 for Partial, position 3 for Full)
    return (splitPartialLabel[4] == splitFullLabel[3]);
}

/**
 * Checks if a scan result is a Partial Label and processes it if so.
 * @param {string[]} processedResults a processed scan result from `processResultString()`.
 * @param {string[]} partialScanStore the `partialScanStore` array.
 * @param {*} decodeResults - The `decodeResults` produced by the Scanner.
 * @param {*} output - The `output` module created by the Scanner.
 * @param {*} previousScanStore - The `previousScanStore` array initialized in the beginning of the script.
 * @returns {[boolean, *, *]} `boolean` (is Partial?), `previousScanStore` array, and modified `output` module.
 */
function checkAndProcessPartialLabel(processedResults, partialScanStore, decodeResults, output, previousScanStore) {
    // check if the results are from a Partial Label
    var rawResults = decodeResults[0].content;
    var isPartial = false;
    if (processedResults[0] == "PARTIAL") {
        isPartial = true;
        // add the RAW scan result to the partial scans store
        if (partialScanStore[0] == "") {
            partialScanStore[0] = rawResults;
            // send first partial message
            output.OLED = "First Partial Label stored for Consolidation.";
            // output nothing
            output.content = "";
        // there is already at least one partial label scan stored
        } else if (partialScanStore[1] == "") {
            // if the first and second scans match, throw duplicate scan error
            if (partialScanStore[0] == rawResults) {
                output = duplicateScanError(output);
            // the new scan is not a duplicate; verify matching serial numbers
            } else {
                var matching = checkPartialSerialNumbers(partialScanStore[0], rawResults);
                // the serial numbers match; store this second scan
                if (matching) {
                    partialScanStore[1] = rawResults;
                    // send second partial message
                    output.OLED = "Second Partial Label stored for Consolidation.";
                    // output nothing
                    output.content = "";
                // the partial label serial numbers do not match; throw consolidation error
                } else {
                    var error = consolidationError(decodeResults, output, previousScanStore, "This Partial Label is for a different Basket. Please consolidate to a Full Label before scanning another Partial Label.");
                    previousScanStore = error[0];
                    output = error[1];
                }
            }
        // the partial label scans store is full (2 labels already scanned); cannot consolidate more partials
        } else {
            var error = consolidationError(decodeResults, output, previousScanStore, "Two Partial Labels have already been scanned. Please consolidate to a Full Label.");
            previousScanStore = error[0];
            output = error[1];
        }
    }
    return [isPartial, previousScanStore, output];
}

/**
 * Consolidates two PARTIAL labels into a singular, paired PARTIAL label. 
 * Draws static (matching) field values from the second partial label.
 * @param {string} partialLabel1 the first (earlier) partial label to consolidate FROM.
 * @param {string} partialLabel2 the second (later) partial label to consolidate TO.
 * @returns {string | null} Consolidated Partial Label string; null if serial numbers do not match.
 */
function consolidatePartialLabels(partialLabel1, partialLabel2) {
    // confirm matching serial numbers
    if (!checkPartialSerialNumbers(partialLabel1, partialLabel2)) {
        return null;
    }
    // split the label strings by the Bar Symbol
    var splitLabel1 = partialLabel1.split("|");
    var splitLabel2 = partialLabel2.split("|");
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

/**
 * Consolidates a PARTIAL label into a FULL label. 
 * Draws static (matching) field values from the FULL label.
 * @param {*} partialLabel the partial label to consolidate FROM.
 * @param {*} fullLabel the full label to consolidate TO.
 * @returns {string | null} Consolidated Full Label string; null if serial numbers do not match.
 */
function consolidateWithFullLabel(partialLabel, fullLabel) {
    // confirm matching serial numbers
    if (!checkFullSerialNumbers(partialLabel, fullLabel)) {
        return null;
    }
    // split the label strings by the Bar Symbol
    var splitPartial = partialLabel.split("|");
    var splitFull = fullLabel.split("|");
    // retrieve the quantity, shift, and operator information from each Split Label
    var quantityPartial = splitPartial.splice(3, 1);
    var quantityFull = splitFull.splice(2, 1);
    var shiftPartial = splitPartial.splice(splitPartial.length - 3, 1);
    var shiftFull = splitFull.splice(splitFull.length - 3, 1);
    var operatorPartial = splitPartial.splice(splitPartial.length - 1, 1);
    var operatorFull = splitFull.splice(splitFull.length - 1, 1);
    // combine the two sets of info into formatted pairs
    var quantityPair = quantityPartial + ":" + quantityFull;
    var shiftPair = shiftPartial + ":" + shiftFull;
    var operatorPair = operatorPartial + ":" + operatorFull;
    // remove the PARTIAL flag from the Partial Label's list of fields
    splitPartial.splice(0, 1)
    // create a new FULL Label string with the paired/existing label info
    // add the first 4 mandatory fields (process|part|quantity|serial number)
    var fullLabelFront = splitFull.splice(0, 1) + "|" +  // process title
                         splitFull.splice(0, 1) + "|" +  // part number/name
                         quantityPair + "|" +            // paired quantities 
                         splitFull.splice(0, 1) + "|";   // serial number (jbk/lot)
    // create the back-end of the Full Label string (date|shift|operator)
    // uses the Full Label date
    var fullLabelBack = splitFull.splice(splitFull.length - 1, 1) + "|" +
                        shiftPair + "|" +
                        operatorPair;
    // create a mid-section to capture any process-dependent fields (whatever is remaining in the splitFull string)
    var fullLabelInner = ""
    while (splitFull.length > 0) {
        // add the field to the inner segment
        fullLabelInner += splitFull.splice(0, 1) + "|";
    }
    // combine the front, inner, and back segments into a Full label string
    var consolidatedLabel = fullLabelFront + fullLabelInner + fullLabelBack;
    return consolidatedLabel;
}

/**
 * Checks for one or two Partial Labels in `partialScanStore`.
 * If two, consolidates them into a single Partial Label.
 * Consolidates either the single or compound Partial Label with the passed Full Label (`rawResults`).
 * @param {*} partialScanStore The `partialScanStore` array.
 * @param {*} rawResults The raw decoded scan result produced by the Scanner.
 * @param {*} output The output module produced by the Scanner.
 * @param {*} previousScanStore The `previousScanStore` array.
 * @returns a modified scanner condition array `[null, previousScanStore, partialScanStore, output]`; 
 * includes the consolidated Full Label in position `0` if successful `[consolidationResult, previousScanStore, partialScanStore, output]`.
 */
function consolidateLabels(partialScanStore, rawResults, output, previousScanStore) {
    // consolidate any partial labels in the partial store
    var consolidationResult = null;
    if (partialScanStore[0] != "") {
        // there are two partials in the store; consolidate them into a single compound partial
        if (partialScanStore[1] != "") {
            consolidationResult = consolidatePartialLabels(partialScanStore[0], partialScanStore[1]);
            // if the result of the consolidation is null, there was a serial number mismatch
            if (consolidationResult == null) {
                // throw a consolidation error and clear the partial store
                var error = consolidationError(rawResults, output, previousScanStore, "Consolidation failed because the Partial Labels are for different Baskets.");
                previousScanStore = error[0];
                output = error[1];
                partialScanStore = ["", ""];
                // return the modified output conditions
                return [null, previousScanStore, partialScanStore, output];
            // the partial labels were consolidated successfully
            } else {
                partialScanStore[0] = consolidationResult;
                partialScanStore[1] = "";
            }
        }
        // now there is only one partial in the store; consolidate it with the full
        consolidationResult = consolidateWithFullLabel(partialScanStore[0], rawResults);
        // if the result of the consolidation is null, there was a serial number mismatch
        if (consolidationResult == null) {
            // throw a consolidation error and clear the partial store
            var error = consolidationError(rawResults, output, previousScanStore, "Consolidation failed because the Partial and Full Labels are for different Baskets.");
            previousScanStore = error[0];
            output = error[1];
            partialScanStore = ["", ""];
            // return the modified output conditions
            return [null, previousScanStore, partialScanStore, output];
        // the partial and full labels were consolidated successfully
        } else {
            partialScanStore = ["", ""];
        }
    }
    // return the consolidation result and the modified scanner conditions
    return [consolidationResult, partialScanStore, output, previousScanStore];
}


/**
 * Error Methods
 */


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
 * Additionally, shifts `previousScanStore` to the `decodeResults` content. 
 * Returns the new `previousScanStore` array.
 * @param {*} decodeResults - The `decodeResults` produced by the Scanner.
 * @param {*} output - The `output` module created by the Scanner.
 * @param {*} previousScanStore - The `previousScanStore` array initialized in the beginning of the script.
 * @param {string} message - An optional message to show instead of the default Data Validation failure message.
 * @returns {string[]}
 */
function dataValidationError(rawResults, output, previousScanStore, message = "<DataValidationErrorMessage>") {
    dmccCommand("OUTPUT.DATAVALID-FAIL");
    output.OLED = message;
    output.content = "";
    // update the last scan
    previousScanStore.shift();
    previousScanStore.push(rawResults);
    return [previousScanStore, output];
}

/**
 * Throws a consolidation error to the Scanner.
 * Sends a data validation command, sends a warning to the screen, and voids output.
 * Additionally, shifts `previousScanStore` to the `decodeResults` content.
 * Returns the new `previousScanStore` array
 * @param {*} decodeResults - The `decodeResults` produced by the Scanner.
 * @param {*} output - The `output` module created by the Scanner.
 * @param {*} previousScanStore - The `previousScanStore` array initialized in the beginning of the script.
 * @param {string} message - An optional message to show instead of the default Data Validation failure message.
 * @returns {string[]}
 */
function consolidationError(rawResults, output, previousScanStore, message = "<ConsolidationErrorMessage>") {
    dmccCommand("OUTPUT.DATAVALID-FAIL");
    output.OLED = message;
    output.content = "";
    // update the last scan
    previousScanStore.shift();
    previousScanStore.push(rawResults);
    return [previousScanStore, output];
}