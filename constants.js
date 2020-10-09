"use strict";

export {TEXT_START_ADDRESS, TEXT_END_ADDRESS, DATA_START_ADDRESS, OPCODES, REGISTERS, FUNCTS, PSEUDO_OPS, REVERSE_OPS, REVERSE_RT};

// define memory segmentation constants
const TEXT_START_ADDRESS = 0x04000000; // instructions begin
const TEXT_END_ADDRESS   = 0x10000000; // instructions must end (they probably end earlier)
const DATA_START_ADDRESS = 0x10010000; // static data is stored

// define acceptable field values
const OPCODES = {
    // R-Types pneumonic: [opcode, funct]
    'add':      [0b000000, 0b100000], 'addu':   [0b000000, 0b100001],
    'sub':      [0b000000, 0b100010], 'subu':   [0b000000, 0b100011],
    'div':      [0b000000, 0b011010], 'divu':   [0b000000, 0b011011],
    'mult':     [0b000000, 0b011000], 'multu':  [0b000000, 0b011001],
    'mflo':     [0b000000, 0b010010], 'mtlo':   [0b000000, 0b010011],
    'mfhi':     [0b000000, 0b010000], 'mthi':   [0b000000, 0b010001],
    'and':      [0b000000, 0b100100], 'or':     [0b000000, 0b100101],
    'xor':      [0b000000, 0b100110], 'nor':    [0b000000, 0b100111],
    'sll':      [0b000000, 0b000000], 'sllv':   [0b000000, 0b000100],
    'srl':      [0b000000, 0b000010], 'srlv':   [0b000000, 0b000110],
    'sra':      [0b000000, 0b000011], 'srav':   [0b000000, 0b000111],
    'slt':      [0b000000, 0b101010], 'sltu':   [0b000000, 0b101011],
    'jr':       [0b000000, 0b001000], 'jalr':   [0b000000, 0b001001],
    'nop':      [0b000000, 0b000000], 'break':  [0b000000, 0b001101],
    'syscall':  [0b000000, 0b001100],
    // I-Types
    'addi':     0b001000, 'addiu':  0b001001,
    'andi':     0b001100, 'ori':    0b001101,
    'xori':     0b001110, 'lw':     0b100011,
    'lh':       0b100001, 'lhu':    0b100101,
    'lb':       0b100000, 'lbu':    0b100100,
    'lui':      0b001111, 'sw':     0b101011,
    'sh':       0b101001, 'sb':     0b101000,
    'beq':      0b000100, 'bne':    0b000101,
    'bgtz':     [0b000111, 0b00000], 'bgez':   [0b000001, 0b00001],
    'bgezal':   [0b000001, 0b10001], 'bltz':   [0b000001, 0b00000],
    'blez':     [0b000110, 0b00000], 'bltzal': [0b000001, 0b10000],
    'slti':     0b001010, 'sltiu':  0b001011,
    // J-Types 
    'j':        0b000010, 'jal':    0b000011
};

const PSEUDO_OPS = ['li', 'move', 'neg'];

const FUNCTS = {
    0b100000: 'add',   0b100001: 'addu',     0b100010: 'sub',     0b100011: 'subu',
    0b011010: 'div',   0b011011: 'divu',     0b011000: 'mult',    0b011001: 'multu',
    0b010010: 'mflo',  0b010011: 'mtlo',     0b010000: 'mfhi',    0b010001: 'mthi',
    0b100100: 'and',   0b100101: 'or',       0b100110: 'xor',     0b100111: 'nor',
    0b000000: 'sll',   0b000100: 'sllv',     0b000010: 'srl',     0b000110: 'srlv',
    0b000011: 'sra',   0b000111: 'srav',     0b101010: 'slt',     0b101011: 'sltu',
    0b001000: 'jr',    0b001001: 'jalr',     0b000000: 'nop',     0b001101: 'break',
    0b001100: 'syscall'
};

const REVERSE_OPS = {
    0b001000: 'addi', 0b001001: 'addiu',
    0b001100: 'andi', 0b001101: 'ori',
    0b001110: 'xori', 0b100011: 'lw',
    0b100001: 'lh', 0b100101: 'lhu',
    0b100000: 'lb', 0b100100: 'lbu',
    0b001111: 'lui', 0b101011: 'sw',
    0b101001: 'sh', 0b101000: 'sb',
    0b000100: 'beq', 0b000101: 'bne',
    0b000111: 'bgtz', 0b000110: 'blez',
    0b001010: 'slti', 0b001011: 'sltiu'
};

const REVERSE_RT = {0b00000: 'bltz', 0b00001: 'bgez', 0b10000: 'bltzal', 0b10001: 'bgezal'};

const REGISTERS = {
    '$zero':    0b00000, '$0':  0b00000,
    '$at':      0b00001, '$1':  0b00001,
    '$v0':      0b00010, '$2':  0b00010,
    '$v1':      0b00011, '$3':  0b00011,
    '$a0':      0b00100, '$4':  0b00100,
    '$a1':      0b00101, '$5':  0b00101,
    '$a2':      0b00110, '$6':  0b00110,
    '$a3':      0b00111, '$7':  0b00111,
    '$t0':      0b01000, '$8':  0b01000,
    '$t1':      0b01001, '$9':  0b01001,
    '$t2':      0b01010, '$10': 0b01010,
    '$t3':      0b01011, '$11': 0b01011,
    '$t4':      0b01100, '$12': 0b01100,
    '$t5':      0b01101, '$13': 0b01101,
    '$t6':      0b01110, '$14': 0b01110,
    '$t7':      0b01111, '$15': 0b01111,
    '$s0':      0b10000, '$16': 0b10000,
    '$s1':      0b10001, '$17': 0b10001,
    '$s2':      0b10010, '$18': 0b10010,
    '$s3':      0b10011, '$19': 0b10011,
    '$s4':      0b10100, '$20': 0b10100,
    '$s5':      0b10101, '$21': 0b10101,
    '$s6':      0b10110, '$22': 0b10110,
    '$s7':      0b10111, '$23': 0b10111,
    '$t8':      0b11000, '$24': 0b11000,
    '$t9':      0b11001, '$25': 0b11001,
    '$k0':      0b11010, '$26': 0b11010,
    '$k1':      0b11011, '$27': 0b11011,
    '$gp':      0b11100, '$28': 0b11100,
    '$sp':      0b11101, '$29': 0b11101,
    '$fp':      0b11110, '$30': 0b11110,
    '$ra':      0b11111, '$31': 0b11111
};