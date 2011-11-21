/*
Copyright (c) 2011, Cosnita Radu Viorel <radu.cosnita@1and1.ro>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the <organization> nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

"use strict";

/**
 * @author Radu Viorel Cosnita
 * @version 1.0
 * @since 21.11.2011
 * @description This module provides the socket container for all web sockets
 * that will be opened on a rain server.
 */

var modPath         = require("path")
    , logger        = require("./logger").getLogger(modPath.basename(module.filename))
    , socketIo      = require("socket.io")
    , sys           = require("sys");

exports.SocketsContainer = SocketsFactory;
exports.SocketsHandler = new SocketHandler();
exports.SocketHandlerAlreadyExist = SocketHandlerAlreadyExist;

/**
 * Class used to hold references of all registered sockets
 * 
 * @param {Integer} socketsPort: A numeric value for sockets port.
 */
function SocketsFactory(socketsPort) {
    this._registeredSockets = {};
    this._socketsPort = socketsPort;
    
    socketIo = socketIo.listen(this._socketsPort);
    
    logger.info("Sockets factory instantiated.");
}

/**
 * Method used to a new socket handler to this factory. If the socketName already exists
 * the method will throw an exception.
 * 
 * @param {String} socketName: Socket name we want to use for multiplexing.
 * @param {SocketHandler} socketObject: Socket object we want to bind.
 */
SocketsFactory.prototype.addSocketHandler = function(socketObject) {    
    var socketName = socketObject.getSocketName();
    
    if(!socketName || socketName.length == 0) {
        throw new Error("Socket name must not be empty.");
    }
    
    if(socketName.charAt(0) != "/") {
        socketName = "/" + socketName;
    }
    
    if(!socketObject) {
        throw new Error("Socket object must not be null.");
    }
   
    logger.debug("Adding a new socket partition " + socketName);    
        
    if(this._registeredSockets[socketName]) {
        throw new SocketHandlerAlreadyExist("Socket " + socketName + " is already binded.");
    }
    
    this._registeredSockets[socketName] = socketObject;
        
    socketIo.of(socketName).on("connection", socketObject.handle);
};

/**
 * This is the typical handler object that must be inherited by each custom socket 
 * handler we implement.
 */
function SocketHandler() {
    /**
     * This method provide the socket name we want to register.
     * 
     * @return The socket name.
     */
    function getSocketName() {}
    
    /**
     * This method is binded to connection event of the main socket. Here you can implement
     * the business logic of the socket.
     */
    function handle(socket) {}
}

/**
 * Custom exception used to mark an existing socket handler.
 */
function SocketHandlerAlreadyExist(msg) {
    this.message = msg;
}

sys.inherits(SocketHandlerAlreadyExist, Error);