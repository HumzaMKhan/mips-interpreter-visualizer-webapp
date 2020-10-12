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
    if(dataLocation != -1) {
        if(dataLocation > textLocation) dataMemory = dataToMemory(code.slice(dataLocation + 5), code.slice(0, dataLocation + 1).split('\n').length);
        else                            dataMemory = dataToMemory(code.slice(dataLocation + 5, textLocation), code.slice(0, dataLocation + 1).split('\n').length);
    }
    if(dataMemory == -1) return -1;

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
        Object.assign({}, dataMemory[0], labelsInstructions[0]),
        Object.assign({}, dataMemory[1], labelsInstructions[1]),
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
function dataToMemory(data, startingLine) {
    let address = DATA_START_ADDRESS;
    let strings = [];
    let formatDirective = '.word';
    let validDirectives = ['.word', '.half', '.byte', '.ascii', '.asciiz'];
    let labels  = {};
    let dataMemory = {};

    // remove comments
    let hashtag;
    do {
        hashtag = data.indexOf('#');
        if(hashtag != -1) {
            let nextline = data.slice(hashtag).indexOf('\n');
            if(nextline != -1) data = data.slice(0, hashtag) + data.slice(nextline + 1);
            else data = data.slice(0, hashtag);
        }
    } while(hashtag != -1);

    // remove strings
    let doubleQuote;
    do {
        doubleQuote = data.indexOf('"');
        if(doubleQuote != -1) {
            let secondDoubleQuote = data.slice(0, doubleQuote + 1).length + data.slice(doubleQuote + 1).indexOf('"');
            if(secondDoubleQuote == -1) return syntaxError(startingLine + data.slice(doubleQuote).split('\n').length, 'There is a double quote here which is not matched');
            strings.push(data.slice(doubleQuote + 1, secondDoubleQuote));
            data = data.slice(0, doubleQuote) + '.STRING' + data.slice(secondDoubleQuote + 1);
        }
    } while(doubleQuote != -1);

    // read remaining directives and data
    let tokens = data.replace(/\n/g, ' ').split(' ');
    console.log(data);
    console.log(tokens);
    for(let i = 0, tokensLength = tokens.length; i < tokensLength; i++) {
        // skip empty tokens (extra spaces)
        if(tokens[i] == '') continue;
        // handle labels
        let colon = tokens[i].indexOf(':');
        if(colon != -1) {
            let label = tokens[i].slice(0, colon); // get label before colon
            if(label in labels)                           // duplicate label location error
                return syntaxError(startingLine + i, 'Two labels cannot have the same name!', label + ': 0x' + (address).toString(16));
            if(Object.values(labels).includes(address))   // duplicate label error
                return syntaxError(startingLine + i, 'Two labels cannot resolve to the same memory location!', labels[label] + ': 0x' + (address).toString(16));
            labels[address] = label;
            continue;
        }
        
        // handle strings, each char is loaded into memory as a byte, .asciiz adds a null terminator at the end
        if(tokens[i] == '.STRING') {
            if(formatDirective == '.ascii' || formatDirective == '.asciiz') {
                let str = strings.shift();
                for(let i = 0, strLength = str.length; i < strLength; i++) dataMemory[address++] = str.charCodeAt(i);
            }
            else return syntaxError(startingLine + i, 'Strings must be loaded into memory using the .ascii or .asciiz directive!', '.asciiz will null terminate the strings for you');
            if(formatDirective == '.asciiz') dataMemory[address++] = 0; // insert null terminator
            continue;
        }

        // handle directive change
        let period = tokens[i].indexOf('.');
        if(period != -1) {
            let directive = tokens[i].slice(period);
            if(validDirectives.includes(directive)) formatDirective = directive;
            else return syntaxError(startingLine + i, 'This is not a valid directive: ' + tokens[i]);
            if(directive == '.word') address += address % 4;
            else if(directive == '.half') address += address % 2;
            continue;
        }
        
        // all other types of lines
        if(isNaN(tokens[i])) return syntaxError(startingLine + i, 'Value: ' + parseInt(tokens[i]) + ' does not match directive (it is not a valid integer)');
        tokens[i] = parseInt(tokens[i]);
        if((formatDirective == '.word') && (tokens[i] <= 2147483647) && (tokens[i] >= -2147483648)) {
            dataMemory[address] = tokens[i];
            address += 4;
            continue;
        }
        if((formatDirective == '.half') && (tokens[i] <= 32767) && (tokens[i] >= -32768)) {
            console.log("HELLO");
            if      (address % 4 == 0) {
                dataMemory[address] &= 0xffff_0000;
                dataMemory[address] |= (tokens[i] & 0xffff);
            }
            else if (address % 4 == 2) {
                dataMemory[address - 2] &= 0xffff;
                dataMemory[address - 2] |= (tokens[i] << 16);
            }
            address += 2;
            continue;
        }
        if((formatDirective == '.byte') && (tokens[i] <= 255) && (tokens[i] >= -256)) {
            if      (address % 4 == 0) {
                dataMemory[address] &= 0xffff_ff00;
                dataMemory[address] |= (tokens[i] & 0xff);
            }
            else if (address % 4 == 1) {
                dataMemory[address - 1] &= 0xffff_00ff;
                dataMemory[address - 1] |= (tokens[i] & 0xff) << 8;
            }
            else if (address % 4 == 2) {
                dataMemory[address - 2] &= 0xff00_ffff;
                dataMemory[address - 2] |= (tokens[i] & 0xff) << 16;
            }
            else if (address % 4 == 3) {
                dataMemory[address - 3] &= 0xff_ffff;
                dataMemory[address - 3] |= (tokens[i] << 24);
            }
            address++;
            continue;
        }
        return syntaxError(lineNumber + i, 'The provided value is not within the range of accepted values!');
    }
    console.log(labels);
    console.log(dataMemory);
    return [labels, dataMemory];
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
            if(label in labels)  // duplicate label location error
                return syntaxError(startingLine + i, 'Two labels cannot have the same name!', label + ': 0x' + (TEXT_START_ADDRESS + (i - memoryOffset) * 4).toString(16));
            if(Object.values(labels).includes(TEXT_START_ADDRESS + (i - memoryOffset) * 4))                   // duplicate label error
                return syntaxError(startingLine + i, 'Two labels cannot resolve to the same memory location!', labels[TEXT_START_ADDRESS + (i - memoryOffset) * 4] + ': 0x' + (TEXT_START_ADDRESS + (i - memoryOffset) * 4).toString(16), label + ': 0x' + (TEXT_START_ADDRESS + (i - memoryOffset) * 4).toString(16));

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