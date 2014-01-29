var ParseError = require("./ParseError");

var buildTree = require("./buildTree");
var parseTree = require("./parseTree");
var utils = require("./utils");

var process = function(toParse, baseNode) {
    utils.clearNode(baseNode);

    var tree = parseTree(toParse);
    var node = buildTree(tree);

    baseNode.appendChild(node);
};

var render = function(toParse) {
  return buildTree(parseTree(toParse));
};

module.exports = {
    render: render,
    ParseError: ParseError
};
