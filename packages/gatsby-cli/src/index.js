#!/usr/bin/env node

const { fork } = require('child_process')
const cmd = process.argv.join(" ")
console.log(cmd);


// spawn a process with default args
const child = fork(cmd)

child.on('message', (msg) => {
  console.log(msg);
})

process.on('unhandledRejection', error => {
  throw error
})

process.on('uncaughtException', error => {
  throw error
})
