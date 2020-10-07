"use strict";
import {TEXT_START_ADDRESS, TEXT_END_ADDRESS, DATA_START_ADDRESS, OPCODES, FUNCT, REGISTERS} from './constants.js';
export {parseCode, getLabels};

// create a syntax error message
function syntax_error(line_number, ...args) {
    console.log('syntax error');
    document.getElementById('output').innerHTML = 'Line ' + line_number + ': SYNTAX ERROR (failed to assemble):\n' + args.join('\n') + '\n';
    return -1; // syntax errors are fatal
}

/*
convert an instruction into a number
*/
function instructionToNumber(instruction) {
    // format of the instruction should be an array of fields starting with opcode
    let opcode = instruction[0];
    if(!(opcode in OPCODES)) return syntax_error(i, "This instruction does not have a valid opcode");
    let number = OPCODES[opcode] << 26;

    switch(opcode) {
        // R-Type: 6op 5rs 5rt 5rd 5shamt 6funct
            // op rd, rs, rt
        case 'add': case 'addu': case 'and': case 'nor': case 'or': case 'slt': case 'sltu': case 'sub': case 'subu': case 'xor':
            if(instruction.length != 4) return syntax_error(i, "This instruction requires 3 parameters");
            if(!(instruction[1] in REGISTERS && instruction[2] in REGISTERS && instruction[3] in REGISTERS)) return syntax_error(i, "All 3 parameters should be valid registers");
            number += instruction[1] << 21 + instruction[2] << 16 + instruction[3] << 11
            // op rd, rt, rs
        case 'sllv': case 'srav': case 'srlv':
            if(instruction.length != 4) return syntax_error(i, "This instruction requires 3 parameters");
            if(!(instruction[1] in REGISTERS && instruction[2] in REGISTERS && instruction[3] in REGISTERS)) return syntax_error(i, "All 3 parameters should be valid registers");
            // op rd, rt, sa
        case 'sll': case 'sra': case 'srl':
            if(instruction.length != 4) return syntax_error(i, "This instruction requires 3 parameters");
            if(!(instruction[1] in REGISTERS && instruction[2] in REGISTERS)) return syntax_error(i, "All 3 parameters should be valid registers");
            if(instruction[3] > 0b11111 || instruction[3] < 0) return syntax_error(i, "Shift amount cannot be more than 31 or less than 0");
            // op rs, rt
        case 'div': case 'divu': case 'mult': case 'multu':
            if(instruction.length != 3) return syntax_error(i, "This instruction requires 2 parameters");
            // op rd, rs
        case 'jalr':
            if(instruction.length != 3) return syntax_error(i, "This instruction requires 2 parameters");
            // op rs
        case 'jr': case 'mthi': case 'mtlo':
            if(instruction.length != 2) return syntax_error(i, "This instruction requires 1 parameter");
            // op rd
        case 'mfhi': case 'mflo':
            if(instruction.length != 2) return syntax_error(i, "This instruction requires 1 parameter");
            // op
        case 'syscall': case 'break': case 'nop':
            if(instruction.length != 1) return syntax_error(i, "This instruction requires 0 parameters");

        // I-type
        case 'addi':
        // J-Type
        case 'j':
    }

    return number;
}

/*

*/
function parseCode(code) {
    // find text segment
    let text_location = code.search(/\.text/i);
    console.log(text_location);
    if(text_location == -1) return syntax_error('NA', 'The .text directive must be included to indicate the code section.');
    let labels_instructions = text_to_instructions(code.slice(text_location + 5));
    if(labels_instructions == -1) return -1;
    // find data segment
    let data_location = code.search(/\.data/i);
    if(data_location == -1) return [[], ...labels_instructions];
    else return [data_to_memory(code.slice(data_location + 5)), ...labels_instructions];
}

function getLabels() {
    return;
}

function data_to_memory(data) {
    return;
}

/*
convert the .text section to memory addressed information
this function will return the instructions and labels indexed by memory address
multiplications by 4 are to compensate for the word-length instructions being stored in byte-addressed memory
errors in this function will be classified as syntax errors
*/
function text_to_instructions(text) {
    let labels = {}, instructions = {}; // dictionaries to contain memory related information
    let memory_offset = 0;              // compensate for lines which shouldn't increment memory
    
    let lines = text.split('\n');       // create array of newline delimited lines
    for(let i = 0, lines_length = lines.length; i < lines_length; i++) { // iterate over each line of code
        // handle non-instruction lines
        let colon = lines[i].indexOf(':');  // find colon to detect a label
        if(colon != -1) {                   // if a colon exists
            // error checking
            let label = lines[i].slice(0, colon).trim();                    // get label before colon
            if(TEXT_START_ADDRESS + (i - memory_offset) * 4 in labels)  // duplicate label location error
                return syntax_error(i, 'Two labels cannot resolve to the same memory location!', labels[TEXT_START_ADDRESS + (i - memory_offset) * 4] + ': 0x' + (TEXT_START_ADDRESS + (i - memory_offset) * 4).toString(16), label + ': 0x' + (TEXT_START_ADDRESS + (i - memory_offset) * 4).toString(16));
            if(Object.values(labels).includes(label))                   // duplicate label error
                return syntax_error(i, 'Two labels cannot have the same name!', label + ': 0x' + (TEXT_START_ADDRESS + (i - memory_offset) * 4).toString(16));

            // no errors
            labels[TEXT_START_ADDRESS + (i - memory_offset) * 4] = label;   // add (memory, label) to labels dictionary
            let remaining = lines[i].slice(colon + 1).trim();               // get remaining line after label
            if(remaining == '') {
                memory_offset++;    // labels do not consume memory
                continue;           // skip remaining line, no more information
            }
            else lines[i] = remaining;
        }
        if(lines[i].trim() == '' || lines[i].trim()[0] == '#') {
            memory_offset++;        // newlines and comments do not consume memory
            continue;               // skip this line
        }
        
        // extract fields from instruction
        let fields = lines[i].trim().split(',');     // create array of comma delimited fields
        for(let i = 0, fields_length = fields.length; i < fields_length; i++) fields[i].toLowerCase();
        let op_first_field = fields.splice(0, 1)[0]; // get and remove opcode and first field of instruction from fields
        let first_space = op_first_field.indexOf(' ');
        let opcode = op_first_field.slice(0, first_space);
        fields.unshift(opcode, op_first_field.slice(first_space).trim());

        // remove inline comments
        let fields_length = fields.length;
        let hashtag = fields[fields_length - 1].indexOf('#');
        if(hashtag != -1) fields[fields_length - 1] = fields[fields_length - 1].slice(0, hashtag);
        
        // remove whitespace around fields
        for(let j = 0; j < fields_length; j++) fields[j] = fields[j].trim();

        // store array of fields at address of memory it goes in
        instructions[TEXT_START_ADDRESS + (i - memory_offset) * 4] = fields;
    }
    
    // dump memory information to the console
    console.log(labels);
    console.log(instructions);
    
    return [labels, instructions];
}