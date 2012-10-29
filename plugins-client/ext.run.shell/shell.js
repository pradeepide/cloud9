/**
 * Shell Module for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 */

"use strict";

define(function(require, exports, module) {
    
var ide = require("core/ide");
var ext = require("core/ext");
var util = require("core/util");
var fs = require("ext/filesystem/filesystem");
var Path = require("path");

module.exports = ext.register("ext/run.shell/run.shell", {
    dev        : "Ajax.org",
    name       : "Save",
    alone      : true,
    type       : ext.GENERAL,
    deps       : [fs],
    offline    : true,

    nodes      : [],
    saveBuffer : {},
    
    metadata : {
        "commands": {
            "cd" : {
                "hint": "change working directory",
                "commands": {
                    "[PATH]": {"hint": "path pointing to a folder. Autocomplete with [TAB]"}
                }
            },
            "ls" : {
                "hint": "list directory contents",
                "commands": {
                    "[PATH]": {"hint": "path pointing to a folder. Autocomplete with [TAB]"}
                }
            },
            "rm" : {
                "hint": "remove a file",
                "commands": {
                    "[PATH]": {"hint": "path pointing to a folder. Autocomplete with [TAB]"}
                }
            },
            "mv": {
                "hint": "move or rename files or directories",
                "commands": {
                    "[PATH]": {"hint": "path pointing to a folder. Autocomplete with [TAB]"}
                }
            },
            "pwd": {"hint": "return working directory name"}
        }
    },

    hook: function() {
        this.processCount = 0;
        
        //ide.addEventListener()
    },

    command: function(user, message, client) {
        var cmdString = "command-" + message.command;
        if (!this[cmdString])
            return false;

        if (message.runner && message.runner !== "shell")
            return false;

        this[cmdString.toLowerCase()](message);

        console.log(message);

        return true;
    },

    "command-internal-autocomplete": function(message) {
        var argv = [].concat(message.argv);
        var cmd = argv.shift();
        var self = this;

        this.getListing(argv.pop(), message.cwd || this.workspaceDir, (cmd == "cd" || cmd == "ls"), function(tail, matches) {
            self.ide.dispatchEvent("internal-autocomplete", {
                matches: matches,
                line   : message.line,
                base   : tail,
                cursor : message.cursor,
                textbox: message.textbox,
                argv   : message.argv
            });
        });
    },


    "command-internal-isfile": function(message) {
        var file  = message.argv.pop();
        var path  = message.cwd;

        path = Path.normalize(path + "/" + file.replace(/^\//g, ""));

        if (path.indexOf(this.workspaceDir) === -1) {
            this.sendResult();
            return;
        }

        ide.send(message);
    },
/*
    this["command-commandhints"] = function(message) {
        var commands = {};
        var _self = this;

        Async.list(Object.keys(this.workspace.plugins))
             .each(function(sName, next) {
                 var oExt = _self.workspace.getExt(sName);
                 if (oExt.$commandHints) {
                     oExt.$commandHints(commands, message, next);
                 }
                 else {
                     if (oExt.metadata && oExt.metadata.commands)
                         apf.extend(commands, oExt.metadata.commands);
                     next();
                 }
             })
             .end(function() {
                 _self.sendResult(0, message.command, commands);
             });
    };
*/

    "command-ps": function(message) {
        var self = this;
        this.pm.ps(function(err, procs) {
            self.sendResult(0, message.command, {
                argv    : message.argv,
                err     : null,
                out     : procs,
                extra   : message.extra
            });
        });
    },

    "command-kill": function(message) {
        var self = this;
        this.pm.kill(message.pid, function(err) {
            if (!err) return;

            self.sendResult(0, message.command, {
                argv  : message.argv,
                code  : -1,
                err   : err || "There was a problem exiting the process",
                extra : message.extra,
                pid   : message.pid
            });
        });
    },

    getListing: function(tail, path, dirmode, callback) {
        var self = this;
        var matches = [];
        tail = (tail || "")
            .trim()
            .split(/\s+/g)
            .pop();

        if (tail.indexOf("/") > -1) {
            path = path.replace(/[\/]+$/, "") + "/" + tail.substr(0, tail.lastIndexOf("/")).replace(/^[\/]+/, "");
            tail = tail.substr(tail.lastIndexOf("/") + 1).replace(/^[\/]+/, "").replace(/[\/]+$/, "");
        }

        this.vfs.readdir(this.path, {encoding: null}, function(err, meta) {
            if (err)
                return callback(err);

            var stream = meta.stream;
            var nodes = [];

            stream.on("data", function(stat) {
                var isDir = self._isDir(stat);

                if (stat.name.indexOf(tail) === 0 && (!dirmode || isDir))
                    matches.push(stat.name + (isDir ? "/" : ""));
            });

            stream.on("end", function() {
                callback(tail, nodes);
            });
        });
    },

    canShutdown: function() {
        return this.processCount === 0;
    }
});
});
