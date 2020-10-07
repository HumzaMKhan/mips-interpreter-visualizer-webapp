export {TEXT_START_ADDRESS, TEXT_END_ADDRESS, DATA_START_ADDRESS, OPCODES, FUNCT, REGISTERS};

// define memory segmentation constants
const TEXT_START_ADDRESS = 0x04000000; // instructions begin
const TEXT_END_ADDRESS   = 0x10000000; // instructions must end (they probably end earlier)
const DATA_START_ADDRESS = 0x10010000; // static data is stored

// define acceptable field values
const OPCODES = {
    'add': 0b000000, 'addu': 0b000000, 'sub': 0b000000, 'subu': 0b000000,
    'addi': 0b001000, 'addiu': 0b001001, 'div': 0b000000, 'divu': 0b000000,
    'mult': 0b000000, 'multu': 0b000000, 'mflo': 0b000000, 'mfhi': 0b000000, 'mtlo': 0b000000, 'mthi': 0b000000, 
    'and': 0b000000, 'andi': 0b001100, 'or': 0b000000, 'ori': 0b000000,
    'xor': 0b000000, 'xori': 0b001110, 'nor': 0b000000,
    'sll': 0b000000, 'sllv': 0b000000, 'srl': 0b000000, 'srlv': 0b000000, 'sra': 0b000000, 'srav': 0b000000,
    'lw': 0b100011, 'lh': 0b100001, 'lhu': 0b100101, 'lb': 0b100000, 'lbu': 0b100100,
    'lui': 0b001111, 'sw': 0b101011, 'sh': 0b101001, 'sb': 0b101000,
    'beq': 0b000100, 'bne': 0b000101, 'bgtz': 0b000111, 'bgez': 0b000001,
    'bgezal': 0b000001, 'bltz': 0b000001, 'blez': 0b000110, 'bltzal': 0b000001,
    'slt': 0b000000, 'sltu': 0b000000, 'slti': 0b001010, 'sltiu': 0b001011,
    'j': 0b000010, 'jr': 0b000000, 'jal': 0b000011,'jalr': 0b000000, 'nop': 0b000000
};

const REGISTERS = {
    '$zero': 0, '$0': 0,
    '$at': 1, '$1': 1,
    '$v0': 2, '$2': 2,
    '$v1': 3, '$3': 3,
    '$a0': 4, '$4': 4,
    '$a1': 5, '$5': 5,
    '$a2': 6, '$6': 6,
    '$a3': 7, '$7': 7,
    '$t0': 8, '$8': 8,
    '$t1': 9, '$9': 9,
    '$t2': 10, '$10': 10,
    '$t3': 11, '$11': 11,
    '$t4': 12, '$12': 12,
    '$t5': 13, '$13': 13,
    '$t6': 14, '$14': 14,
    '$t7': 15, '$15': 15,
    '$s0': 16, '$16': 16,
    '$s1': 17, '$17': 17,
    '$s2': 18, '$18': 18,
    '$s3': 19, '$19': 19,
    '$s4': 20, '$20': 20,
    '$s5': 21, '$21': 21,
    '$s6': 22, '$22': 22,
    '$s7': 23, '$23': 23,
    '$t8': 24, '$24': 24,
    '$t9': 25, '$25': 25,
    '$k0': 26, '$26': 26,
    '$k1': 27, '$27': 27,
    '$gp': 28, '$28': 28,
    '$sp': 29, '$29': 29,
    '$fp': 30, '$30': 30,
    '$ra': 31, '$31': 31,
}

const FUNCT = {

}