

/**
 * PC Line Stocking Scanner Configuration.
 * 
 * Consolidation Logic NOT included.
 * 
 * Data Field Format Validation included.
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

    // likely not possible for supplier labels
    // // not a partial label scan
    // // verify correct previous process (1st field on QR Code)
    // // REPLACE ME
    // var previousProcess = "<previousProcessTitle>";
    // if (!processedResults[0] == previousProcess) {
    //     // REPLACE ME
    //     output = dataValidationError(output, "Invalid Label. Please scan a <previousProcess> Label.");
    //     return;
    // }

    // validate that the first field is a part number
    if (!validatePartNumber(processedResults[0])) {
        // not a Part Number; throw an error
        output = dataValidationError(output, "Invalid Supplier Box Label or Part Number");
        return;
    }

    // validate that the third field is a quantity
    if (!validateQuantity(processedResults[2])) {
        // not a Quantity; throw an error
        output = dataValidationError(output, "Invalid Supplier Box Label or Quantity");
        return;
    }

    // validate that the fourth field is a Lot #
    if (!validateLotNumber(processedResults[3])) {
        // not a Lot #; throw an error
        output = dataValidationError(output, "Invalid Supplier Box Label or Lot Number");
        return;
    }
    
    // all checks, consolidations, and validations were passed
    // generate a final output string, send it to the output module, and show a message on the screen
    var finalOutput = generateOutputString(readerProperties, processedResults);
    output.content = finalOutput;
    output.OLED = "Supplier Box Label captured successfully.";
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
	var inputString = String(raw);
    // replace the newline between part number/name with a bar "|"
    inputString = inputString.replace(/\r?\n/g, "|");
    // split the string into an array by the bar symbol
    var inputList = inputString.split("|");
    // remove whitespace, comma, ampersand, and newline characters from each field
    for (var i = 0; i < inputList.length; i++) {
        _string = inputList[i];
        _string = _string.replace(/\s/g, "");
        _string = _string.replace(/\\000026/g, "");
        _string = _string.replace(/\n/g, "");
        _string = _string.replace(",", "")
        inputList[i] = _string;
    }
	// return the processed result array
	return inputList;
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
    // add the IP address of the scanner to the output
    // REPLACE ME -- BUT DON'T COMMIT TO GITHUB!
    // CONFIGURE THIS ON THE INDIVIDUAL SCANNER
    outputString += "," + "<ip>,Supplier-Master";
    // add the processed Scan results to the output
    for (var i = 0; i < processedResultList.length; i++) {
        outputString += "," + String(processedResultList[i]);
    }
    // add a newline character to the end of the output
    outputString += "\n"
    return outputString;
}


/**
 * Format Validator Methods.
 * 
 * Call each to validate the needed fields for each Label type.
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
 * Validates a string as a Lot Number.
 * @param {string} string 
 * @returns {boolean}
 */
function validateLotNumber(string) {
    // set a regex pattern for Lot numbers
    var lotPattern = /^[\w]+$/;
    if (lotPattern.test(string)) {
		return true;	
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