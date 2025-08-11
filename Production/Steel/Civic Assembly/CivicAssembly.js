

/**
 * Civic Assembly Scanner Configuration.
 * 
 * Data Field Format Validation included.
 * 
 * Supplier & WIP Dual Scanning Logic included.
 */


// holds the previous scan result
var previousScanStore = [""];
// label origin type flag (set to either SUPPLIER or INHOUSE)
var labelOriginType = null;


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
        
    // results decoded successfully; save the raw results
    var rawResults = decodeResults[0].content;

    // check the code output against the previously scanned code(s)
    if (isStringInArray(previousScanStore, rawResults)) {
        // duplicate scan; throw an error
        output = duplicateScanError(output);
        return;
    }
    
    // not a duplicate scan; shift out the previous scan and add the new scan into the list
    previousScanStore.shift();
    previousScanStore.push(rawResults);

    // process the initial results
    var processedResults = processResultString(rawResults);

    // configure allowance of supplier parts and globally accepted parts
    var acceptsSupplierComponents = true;
    var acceptedPartNumbers = [
        "YN-T20-53200-A021-YE1",
        "YN-T20-53200-A121-YF1",
        "YN-3W0-53200-A001-YD1",
        "YN-3W0-53200-A101-YD1",
        "00-T20-532AP-A000-YB1",
        "00-TBA-90751-A020-Y2",
        "00-TBA-533BL-A020-YA1",
        "00-T20-532AS-A000-YB2",
        "00-T20-5321Z-A000-Y03",
        "00-T20-5321Z-A100-Y03",
        "00-T20-533EX-A000-Y01",
        "YN-T20-5333C-A000-Y00",
        "YN-TBA-53350-A020-YB0",
        "YN-T20-53375-A000-Y01",
        "YN-T20-5336S-A000-Y03",
        "YN-T20-5336L-A000-Y03",
        "00-T20-53364-A000-Y01",
        "00-SNA-5337G-A020-YA0",
        "00-T20-53340-A000-Y03",
        "YN-TBA-53371-A020-YB1",
        "00-TBA-53371-A020-YB0",
        "YN-T20-53310-A000-YB1",
        "YN-T20-53310-A100-Y0B",
        "YN-3W0-53310-A000-YB3",
        "YN-3W0-53310-A100-Y02",
        "00-T6L-53322-H010-YA0",
        "00-T6L-53322-H010",
        "00-SNA-533AF-A040-Y2"
    ];

    // identify the source of the Label as either WIP, Supplier, or none
    var previousProcesses = [
        "4155-CIV-Pipe-Weld", 
        "4155-CIV-Tilt-Brkt-Weld", 
        "4159-STL-Uppershaft-MC", 
        "4162-CIV-Shaft-Clinch", 
        "4165-CIV-Pivot-Housing-MC"
    ];
    if (isStringInArray(previousProcesses, processedResults[0])) {
        labelOriginType = "YNA";
    } else if (!acceptsSupplierComponents) {
		// Suppliers are not accepted and WIP is invalid; throw an error
        output = dataValidationError(output, "Invalid WIP Label. Please scan a valid WIP Label.");
        return;
	} else {
		labelOriginType = "SUPPLIER";
	}

    // if the label was not marked as INHOUSE or SUPPLIER, throw an error
    if (labelOriginType == null) {
        output = dataValidationError(output, "Invalid Label. Please scan a valid WIP or Supplier Label.");
        return;
    }

    // validate WIP label fields
    if (labelOriginType == "YNA") {
        // validate part number
        var partNumber = processedResults[1].toUpperCase();
        processedResults[1] = partNumber;
        if (!validatePartNumber(partNumber, acceptedPartNumbers)) {
            output = dataValidationError(output, "Invalid WIP Label or Invalid Part Number.");
            return;
        }
        // validate the third field as a Quantity
        if (!validateQuantity(processedResults[3])) {
            output = dataValidationError(output, "Invalid WIP Label or Invalid Quantity: " + processedResults[2] + ".");
            return;
        }
        // validate the second to last field as the shift
        if (!validateShiftNumber(processedResults[processedResults.length - 2])) {
            output = dataValidationError(output, "Invalid WIP Label or Invalid Shift Number.");
            return;
        }
        // validate the third to last field as the date
        if (!validateDate(processedResults[processedResults.length - 3])) {
            output = dataValidationError(output, "Invalid WIP Label or Invalid Date.");
            return;
        }
        // validate the remaining, variable Label fields for each Process
        if (processedResults[0] == "4165-CIV-Pivot-Housing-MC") {
            // validate as PH M/C Label
            // validate the fourth field as a JBK #
            if (!validateJBKNumber(processedResults[4])) {
                output = dataValidationError(output, "Invalid WIP Label or Invalid JBK #.");
                return;
            }
            // validate the fifth field as a Deburr JBK #
            if (!validateJBKNumber(processedResults[5])) {
                output = dataValidationError(output, "Invalid WIP Label or Invalid Deburr JBK #.");
                return;
            }
        } 
        // all remaining label types must have Lot # instead of JBK #
        // validate the fourth field as a Lot #
        if (!validateLotNumber(processedResults[4])) {
            output = dataValidationError(output, "Invalid WIP Label or Invalid Lot #.");
            return;
        }
        // only Pipe Weld and Shaft Clinch have additional verification
        if ((processedResults[0] == "4155-CIV-Pipe-Weld") || (processedResults[0] == "4162-CIV-Shaft-Clinch")) {
            // validate as Pipe Weld or Shaft Clinch Label
            // validate the fifth field as a Model #
            if (!validateModel(processedResults[5])) {
                output = dataValidationError(output, "Invalid WIP Label or Invalid Model #.");
                return;
            }
        }
    // validate Supplier Label fields
    } else if (labelOriginType == "SUPPLIER") {
        // validate part number
        var partNumber = processedResults[0].toUpperCase();
        processedResults[0] = partNumber;
        if (!validatePartNumber(partNumber, acceptedPartNumbers)) {
            output = dataValidationError(output, "Invalid Supplier Label or Invalid Part Number.");
            return;
        }
        // validate other fields
        if (!validateLotNumber(processedResults[2])) {
            output = dataValidationError(output, "Invalid Supplier Label or Invalid Lot Number.");
            return;
        }
        if (!validateQuantity(processedResults[3])) {
            output = dataValidationError(output, "Invalid Supplier Label or Invalid Quantity.");
            return;
        }
        // confirm that there is a serial number to validate
        if (processedResults.length >= 5) {
            // confirm the field has at least 1 character
            if (!processedResults[4].length > 0) {
                output = dataValidationError(output, "Invalid Supplier Label or Invalid SerialNumber.");
                return;
            }
        // no serial number included; copy the Lot Number to the Serial Number field
        } else {
            processedResults.push(processedResults[2]);
        }
    }
    
    // all checks and validations were passed
    // generate a final output string, send it to the output module, and show a message on the screen
    var finalOutput = generateOutputString(readerProperties, processedResults);
    output.content = finalOutput;
    output.OLED = "JBK/Lot # " + processedResults[4] + " captured successfully.";
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
    outputString += "," + "<ip>";
    // add the supplier tag if needed
    if (labelOriginType == "SUPPLIER") {
        outputString += ",Supplier-Component"
    }
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
 * 
 * Remove unused methods to avoid loading useless script onto the Scanner.
 * REPLACE ME
 */


/**
 * Validates a string as a Part Number using a regular expression test.
 * @param {string} string
 * @param {string[]} acceptedPartNumbers
 * @returns {boolean}
 */
function validatePartNumber(string, acceptedPartNumbers) {
	// confirm that the part is in the accepted list
    if (isStringInArray(acceptedPartNumbers, string)) {
        // part number is valid
        return true;
    }
	// none of the checks were successful
	return false;
}

/**
 * Validates a string as a Date using a regular expression test.
 * @param {string} string 
 * @returns {boolean}
 */
function validateDate(string) {
    // set a regex pattern for Date format
    var datePattern = /^\d?\d\/\d?\d\/\d\d\d\d\-\d\d?\:\d\d?\:\d\d?$/;
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
    // check that the string is 1-3 occurrences of ['1', '2', '3'], each separated by ':'
    var shiftPattern = /^[0-9][\:]?[0-9]?[\:]?[0-9]?$/;
    if (shiftPattern.test(string)) {
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
 * Validates a string as a Model number.
 * @param {string} string 
 * @returns {boolean}
 */
function validateModel(string) {
    // set a regex pattern for Model numbers
    var modelPattern = /^\w\w\w$/;
    if (modelPattern.test(string)) {
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
    var quantityPattern = /^[0-9\:]+$/;
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