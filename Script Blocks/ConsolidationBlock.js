

/**
 * Template Scanner Configuration.
 * 
 * Boilerplate code for all Scanner Configurations.
 * 
 * Consolidation Block included.
 */


// holds the previous scan result
var previousScanStore = [""];
// used to hold 1 or 2 partial label scan results for consolidation
var partialScanStore = ["", ""]


/** 
 * This method is invoked on a successful code read.
 * @param decodeResults - Array of results and scan information produced by the scanner.
 * @param readerProperties - Array of Scanner Properties.
 * @param output - Array allowing customization of the output behavior of the Scanner.
 **/ 
function onResult(decodeResults, readerProperties, output) {
	// if the result was not successfully decoded, escape immediately
	if (!decodeResults[0].decoded) {
        dmccCommand("OUTPUT.NOREAD");
        return;
    }
        
    // results decoded successfully
    // save the raw results
    var rawResults = decodeResults[0].content;

    // check the code output against the previously scanned code(s)
    if (isStringInArray(previousScanStore, rawResults)) {
        // duplicate scan; throw an error
        output = duplicateScanError(output);
        return;
    }
    
    // not a duplicate scan
    // shift out the previous scan and add the new scan into the list
    previousScanStore.shift();
    previousScanStore.push(rawResults);

    // process the initial results
    var processedResults = processResultString(rawResults);

    // perform partial label scan checks
    if (processedResults[0] == "PARTIAL") {
        var storeSlot = null;
        var messageText = "";
        if (partialScanStore[0] == "") {
            // add the partial label to the first store slot
            storeSlot = 0;
            messageText = "First";
        } else if (partialScanStore[1] == "") {
            // confirm the serial numbers match
            if (!checkPartialSerialNumbers(partialScanStore[0], rawResults)) {
                // serial numbers don't match; throw an error
                output = consolidationError(output, "This Partial Label is for a different Basket. Please consolidate to a Full Label before scanning another Partial Label.");
                return;
            }
            // add the partial label to the second store slot
            storeSlot = 1;
            messageText = "Second";
        }
        // was a store slot available?
        if (storeSlot == null) {
            // no store slot available; throw an error
            output = consolidationError(output, "Two Partial Labels have already been scanned. Please consolidate to a Full Label.");
        } else {
            // add the scan to the store, send a message, and exit the script
            partialScanStore[storeSlot] = rawResults;
            output.OLED = messageText + " Partial Label stored for Consolidation.";
            output.content = "";
            return;
        }
    }

    // not a partial label scan
    // verify correct previous process (1st field on QR Code)
    /** Enter previous process here */
    var previousProcess = "4420 - Diecast";
    if (!processedResults[0] == previousProcess) {
        output = dataValidationError(output, "Invalid Label. Please scan a <previousProcess> Label.");
        return;
    }

    // check for and perform any needed consolidations
    var consolidationResults = consolidateLabels(partialScanStore, rawResults, output);
    // confirm that the consolidation was either not required or successful
    if (consolidationResults[0] && consolidationResults[1] == null) {
        // consolidation was required and failed; throw the error from the consolidationResults
        output = consolidationResults[2];
        return;
    }
    // either a consolidation was required and succeeded or no consolidation was required
    var consolidatedLabel = null;
    if (consolidationResults[0]) {
        // consolidation was required and succeeded; set the output content and the OLED Message
        consolidatedLabel = consolidationResults[1];
    }
    // save the modified output module (this is all that needs to happen if no consolidation was made)
    output = consolidationResults[2];

    // update the processed result to a processed version of the consolidated label (only if a consolidation occurred)
    if (consolidatedLabel != null) {
        processedResults = processResultString(consolidatedLabel);
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
    
    // all checks, consolidations, and validations were passed
    // generate a final output string, send it to the output module, and show a message on the screen
    var finalOutput = generateOutputString(readerProperties, processedResults);
    output.content = finalOutput;
    output.OLED = "<Message>";
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
 * @returns > `[true, consolidationResult, output]` if a consolidation was required and was made successfully;
 * 
 *          > `[false, null, output]` if no consolidation was needed;
 * 
 *          > `[true, null, output]` if a consolidation was required but it failed due to mismatching serial numbers.
 */
function consolidateLabels(partialScanStore, rawResults, output) {
    // consolidate any partial labels in the partial store
    var intermediatePartialLabel = null;
    if (partialScanStore[0] != "") {
        // there are two partials in the store; consolidate them into a single compound partial
        if (partialScanStore[1] != "") {
            intermediatePartialLabel = consolidatePartialLabels(partialScanStore[0], partialScanStore[1]);
            // if the result of the consolidation is null, there was a serial number mismatch
            if (intermediatePartialLabel == null) {
                // throw a consolidation error and clear the partial store
                output = consolidationError(output, "Consolidation failed because the Partial Labels are for different Baskets.");
                // return the modified output conditions
                return [true, null, output];
            }
        }
        // now there is only one partial in the store; consolidate the partial label with the full label
        var consolidatedLabel = consolidateWithFullLabel(intermediatePartialLabel, rawResults);
        // if the result of the consolidation is null, there was a serial number mismatch
        if (consolidatedLabel == null) {
            // throw a consolidation error and clear the partial store
            output = consolidationError(output, "Consolidation failed because the Partial and Full Labels are for different Baskets.");
            // return the modified output conditions
            return [true, null, output];
        }
        // the partial and full labels were consolidated successfully
        return [true, consolidatedLabel, output];   
    // there were no partial labels to consolidate
    } else {
        return [false, null, output]
    }
}


/**
 * Error Methods
 */


/**
 * Throws a duplicate scan error to the Scanner. 
 * Sends a data validation failure command, sends a warning to the screen, and voids output.
 * @param {Array} output - The output module generated by the Scanner.
 * @returns {*} a modified `output` module.
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
 * @param {*} output - The `output` module created by the Scanner.
 * @param {string} message - An optional message to show instead of the default Data Validation failure message.
 * @returns {*} a modified `output` module.
 */
function dataValidationError(output, message = "<DataValidationErrorMessage>") {
    dmccCommand("OUTPUT.DATAVALID-FAIL");
    output.OLED = message;
    output.content = "";
    return output;
}

/**
 * Throws a consolidation error to the Scanner.
 * Sends a data validation command, sends a warning to the screen, and voids output.
 * @param {*} output - The `output` module created by the Scanner.
 * @param {string} message - An optional message to show instead of the default Data Validation failure message.
 * @returns {*} A modified `output` module.
 */
function consolidationError(output, message = "<ConsolidationErrorMessage>") {
    dmccCommand("OUTPUT.DATAVALID-FAIL");
    output.OLED = message;
    output.content = "";
    return output;
}