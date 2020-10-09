"use strict";

import {TEXT_START_ADDRESS, TEXT_END_ADDRESS, DATA_START_ADDRESS, OPCODES, REGISTERS} from './constants.js';
import {assemblyToMachine} from './instructionConversion.js'
export {parseCode, syntaxError};

// create a syntax error message
function syntaxError(lineNumber, ...args) {
    document.getElementById('output').innerHTML = 'Line ' + lineNumber + ': SYNTAX ERROR (failed to assemble):\n' + args.join('\n') + '\n';
    return -1; // syntax errors are fatal
}

// convert provided code to machine code and load it into memory
function parseCode(code) {
    // find text segment
    let textLocation = code.search(/\.text/i);
    if(textLocation == -1) return syntaxError('NA', 'The .text directive must be included to indicate the code section.');
    // labels, memory
    let labelsInstructions = textToInstructions(code.slice(textLocation + 5), code.slice(0, textLocation + 1).split('\n').length);
    if(labelsInstructions == -1) return -1;
    // find data segment
    let dataLocation = code.search(/\.data/i);
    let dataMemory = {};
    if(dataLocation != -1) dataMemory = dataToMemory(code.slice(dataLocation + 5));

    // if the .globl directive is defined, try to set the startAddress to its label
    let globlLocation = code.search(/\.globl /i);
    let startAddress;
    if(globlLocation == -1) startAddress = TEXT_START_ADDRESS;
    else {
        let remaining = code.slice(globlLocation + 6);
        let endOfGloblLine = remaining.indexOf('\n');
        if(endOfGloblLine == -1 && !(remaining.slice(globlLocation + 6).trim() in labelsInstructions[0])) return syntaxError(code.slice(0, globlLocation + 1).split('\n').length, 'Label: ' + remaining.slice(globlLocation + 6).trim() + ' is not a defined label!');
        else if(endOfGloblLine != -1 && !(remaining.slice(globlLocation + 6, endOfGloblLine).trim() in labelsInstructions[0])) return syntaxError(code.slice(0, globlLocation + 1).split('\n').length, 'Label: ' + remaining.slice(globlLocation + 6, endOfGloblLine).trim() + ' is not a defined label!');
        startAddress = (endOfGloblLine == -1) ? labelsInstructions[0][remaining.slice(globlLocation + 6).trim()] : labelsInstructions[0][remaining.slice(globlLocation + 6, endOfGloblLine).trim()];
    }
    
    // [labels, memory, pcToLine, exitAddress, startAddress]
    return [
        labelsInstructions[0],
        Object.assign({}, dataMemory, labelsInstructions[1]),
        labelsInstructions[2],
        Math.max.apply(null, Object.keys(labelsInstructions[1])),
        startAddress
    ];
}

/*
convert the .data section to memory addressed information
this function will return the labels pointing to starting addresses
errors in this function will be classified as syntax errors
*/
function dataToMemory(data) {
    return;
}

/*
convert the .text section to memory addressed information
this function will return the instructions and labels indexed by memory address
multiplications by 4 are to compensate for the word-length instructions being stored in byte-addressed memory
errors in this function will be classified as syntax errors
*/
function textToInstructions(text, startingLine) {
    let labels = {}, instructions = {}; // dictionaries to contain memory related information
    let memoryOffset = 0;              // compensate for lines which shouldn't increment memory
    
    let lines = text.split('\n');       // create array of newline delimited lines
    let linesLength = lines.length;
    let pcToLine = {};
    for(let i = 0; i < linesLength; i++) { // iterate over each line of code
        // handle non-instruction lines
        // remove comments
        let hashtag = lines[i].indexOf('#');
        if(hashtag != -1) lines[i] = lines[i].slice(0, hashtag);

        let colon = lines[i].indexOf(':');  // find colon to detect a label
        if(colon != -1) {                   // if a colon exists
            // error checking
            let label = lines[i].slice(0, colon).trim();                    // get label before colon
            if(TEXT_START_ADDRESS + (i - memoryOffset) * 4 in labels)  // duplicate label location error
                return syntaxError(startingLine + i, 'Two labels cannot resolve to the same memory location!', labels[TEXT_START_ADDRESS + (i - memoryOffset) * 4] + ': 0x' + (TEXT_START_ADDRESS + (i - memoryOffset) * 4).toString(16), label + ': 0x' + (TEXT_START_ADDRESS + (i - memoryOffset) * 4).toString(16));
            if(Object.values(labels).includes(label))                   // duplicate label error
                return syntaxError(startingLine + i, 'Two labels cannot have the same name!', label + ': 0x' + (TEXT_START_ADDRESS + (i - memoryOffset) * 4).toString(16));

            // no errors
            labels[TEXT_START_ADDRESS + (i - memoryOffset) * 4] = label;   // add (memory, label) to labels dictionary
            let remaining = lines[i].slice(colon + 1).trim();               // get remaining line after label
            if(remaining == '') {
                memoryOffset++;    // labels do not consume memory
                continue;           // skip remaining line, no more information
            }
            else lines[i] = remaining;
        }
        if(lines[i].trim() == '') {
            memoryOffset++;         // newlines and comments do not consume memory
            continue;               // skip this line
        }
        
        // extract fields from instruction
        let fields = lines[i].trim().split(',');     // create array of comma delimited fields
        let fieldsLength = fields.length;
        for(let j = 0; j < fieldsLength; j++) fields[j].toLowerCase();
        if(!(fieldsLength == 1 && fields[0].trim().split(' ').length == 1)) {
            let opFirstField = fields.splice(0, 1)[0]; // get and remove opcode and first field of instruction from fields
            let firstSpace = opFirstField.indexOf(' ');
            let opcode = opFirstField.slice(0, firstSpace);
            fields.unshift(opcode, opFirstField.slice(firstSpace).trim());
            fieldsLength++;
        }
        
        // remove whitespace around fields
        for(let j = 0; j < fieldsLength; j++) fields[j] = fields[j].trim();

        // store array of fields at address of memory it goes in
        let machineCodeInstruction = assemblyToMachine(startingLine + i, i + TEXT_START_ADDRESS, fields);
        if(machineCodeInstruction == -1) return -1;
        instructions[TEXT_START_ADDRESS + (i - memoryOffset) * 4] = machineCodeInstruction;
        pcToLine[TEXT_START_ADDRESS + (i - memoryOffset) * 4] = startingLine + i;
    }
    return [labels, instructions, pcToLine];
}