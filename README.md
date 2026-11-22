# Tiny Stack VM

[![make.fun](https://make.fun/badge.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-blue)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![tiny stack VM](https://img.shields.io/badge/VM-tiny--stack-green)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

A tiny stack virtual machine for [make.fun bounty tiny-stack-vm-01-run-20261122](https://make.fun/bounty/tiny-stack-vm-01-run-20261122).

`main.ts` runs all 40 instances of the ISA v1 bytecode set: 32-bit wrapping
arithmetic, a 256-value stack, calls, 256 words of memory, input/output, and
all ten traps with their exit codes. Run: `node main.ts` (reads `/input`,
writes `/output`).
