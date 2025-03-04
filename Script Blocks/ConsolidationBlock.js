

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
        inLastRead = isStringInArray(previousScan, decodeResults[0].content);
        if (!inLastRead) {
            // shift out the previous scan and add the new scan into the list
            previousScan.shift();
            previousScan.push(decodeResults[0].content);
            // verify correct previous process (1st field on QR Code)
            /** Enter previous process here */
            var previousProcess = "";
            if (!processedResults[0] == previousProcess) {
                previousScan, output = dataValidationError(decodeResults, output, previousScan, "Invalid Label. Please scan a <previousProcess> Label.");
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
    // split the labels by the bar symbol delimiter
    var splitLabel1 = partialLabel1.split("|");
    var splitLabel2 = partialLabel2.split("|");
    // verify that the two Labels have a matching serial number
    if (splitLabel1[4] != splitLabel2[4]) {
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