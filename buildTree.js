var Style = require("./Style");

var parseTree = require("./parseTree");
var utils = require("./utils");

function Options(style, color) {
    this.style = style;
    this.color = color;
}

Options.prototype.withStyle = function(style) {
    return new Options(style, this.color);
}

Options.prototype.withColor = function(color) {
    return new Options(this.style, color);
}

var buildExpression = function(expression, options, prev) {
    var groups = [];
    for (var i = 0; i < expression.length; i++) {
        var group = expression[i];
        groups.push(buildGroup(group, options, prev));
        prev = group;
    }
    return groups;
};

var makeSpan = function(className, children) {
    var span = document.createElement("span");
    span.className = className || "";

    span.height = 0;
    span.depth = 0;

    //span.innerHTML = '<span style="position:absolute">.</span>'

    if (children) {
        for (var i = 0; i < children.length; i++) {
            span.appendChild(children[i]);

            if (children[i].height > span.height) {
                span.height = children[i].height;
            }
            if (children[i].depth > span.depth) {
                span.depth = children[i].depth;
            }
        }
    }

    return span;
};

var sig1 = 0.025;
var sig2 = 0;
var sig3 = 0;
var sig4 = 0;
var sig5 = 0.431;
var sig6 = 1;
var sig7 = 0;
var sig8 = 0.677;
var sig9 = 0.394;
var sig10 = 0.444;
var sig11 = 0.686;
var sig12 = 0.345;
var sig13 = 0.413;
var sig14 = 0.363;
var sig15 = 0.289;
var sig16 = 0.150;
var sig17 = 0.247;
var sig18 = 0.386;
var sig19 = 0.050;
var sig20 = 2.390;
var sig21 = 0.101;
var sig22 = 0.250;

var xi1 = 0;
var xi2 = 0;
var xi3 = 0;
var xi4 = 0;
var xi5 = .431;
var xi6 = 1;
var xi7 = 0;
var xi8 = .04;
var xi9 = .111;
var xi10 = .166;
var xi11 = .2;
var xi12 = .6;
var xi13 = .1;

var groupTypes = {
    mathord: function(group, options, prev) {
        return makeSpan("mord" + options.color, [mathit(group.value)]);
    },

    textord: function(group, options, prev) {
        return makeSpan("mord" + options.color, [textit(group.value)]);
    },

    bin: function(group, options, prev) {
        var className = "mbin";
        var prevAtom = prev;
        while (prevAtom && prevAtom.type == "color") {
            var atoms = prevAtom.value.value;
            prevAtom = atoms[atoms.length - 1];
        }
        if (!prev || utils.contains(["bin", "open", "rel"], prevAtom.type)) {
            group.type = "ord";
            className = "mord";
        }
        return makeSpan(className + options.color, [textit(group.value)]);
    },

    rel: function(group, options, prev) {
        return makeSpan("mrel" + options.color, [textit(group.value)]);
    },

    supsub: function(group, options, prev) {
        var base = buildGroup(group.value.base, options);
        var subscale = options.style.sub().sizeMultiplier /
                options.style.sizeMultiplier;

        if (group.value.sup) {
            var sup = buildGroup(group.value.sup, options.withStyle(options.style.sup()));
            var supsup = makeSpan(options.style.sup().cls(), [sup]);
            var suprow = makeSpan("msup " + options.style.cls(), [supsup]);
        }

        if (group.value.sub) {
            var sub = buildGroup(group.value.sub, options.withStyle(options.style.sub()));
            var subsub = makeSpan(options.style.sub().cls(), [sub]);
            var subrow = makeSpan("msub " + options.style.cls(), [subsub]);
        }

        var u = base.height - sig18 * subscale;
        var v = base.depth + sig19 * subscale;

        var p;
        if (options.style === Style.DISPLAY) {
            p = sig13;
        } else if (options.style.cramped) {
            p = sig15;
        } else {
            p = sig14;
        }

        var supsub;

        if (!group.value.sup) {
            v = Math.max(v, sig16, sub.height * subscale - 0.8 * sig5);

            subrow.style.top = v + "em";

            subrow.depth = subrow.depth * subscale + v;
            subrow.height = 0;

            supsub = makeSpan("msupsub", [subrow]);
        } else if (!group.value.sub) {
            u = Math.max(u, p, sup.depth * subscale + 0.25 * sig5);

            suprow.style.top = -u + "em";

            suprow.height = suprow.height * subscale + u;
            suprow.depth = 0;

            supsub = makeSpan("msupsub", [suprow]);
        } else {
            u = Math.max(u, p, sup.depth * subscale + 0.25 * sig5);
            v = Math.max(v, sig17);

            var theta = xi8;

            var supdepth = sup.depth * subscale;
            var subheight = sub.height * subscale;

            if ((u - supdepth) - (subheight - v) < 4 * theta) {
                v = 4 * theta - (u - supdepth) + subheight;
                var psi = 0.8 * sig5 - (u - supdepth);
                if (psi > 0) {
                    u += psi;
                    v -= psi;
                }
            }

            suprow.style.top = -u + "em";
            subrow.style.top = v + "em";

            suprow.height = suprow.height * subscale + u;
            suprow.depth = 0;

            subrow.height = 0;
            subrow.depth = subrow.depth * subscale + v;

            supsub = makeSpan("msupsub", [suprow, subrow]);
        }

        return makeSpan("mord", [base, supsub]);
    },

    open: function(group, options, prev) {
        return makeSpan("mopen" + options.color, [textit(group.value)]);
    },

    close: function(group, options, prev) {
        return makeSpan("mclose" + options.color, [textit(group.value)]);
    },

    frac: function(group, options, prev) {
        if (utils.isBuggyWebKit) {
            throw new ParseError(
                    "KaTeX fractions don't work in WebKit <= 537.1");
        }

        var fstyle = options.style;
        if (group.value.size === "dfrac") {
            fstyle = Style.DISPLAY;
        } else if (group.value.size === "tfrac") {
            fstyle = Style.TEXT;
        }

        var nstyle = fstyle.fracNum();
        var dstyle = fstyle.fracDen();

        var numer = makeSpan("mfracnum " + nstyle.cls(), [
            makeSpan("", [
                buildGroup(group.value.numer, options.withStyle(nstyle))
            ])
        ]);
        var mid = makeSpan("mfracmid");
        var denom = makeSpan("mfracden " + dstyle.cls(), [
            makeSpan("", [
                buildGroup(group.value.denom, options.withStyle(dstyle))
            ])
        ]);

        return makeSpan("minner mfrac " + fstyle.cls() + options.color, [
            numer, mid, denom
        ]);
    },

    color: function(group, options, prev) {
        var frag = document.createDocumentFragment();
        var els = buildExpression(
            group.value.value,
            options.withColor(" " + group.value.color),
            prev
        );
        for (var i = 0; i < els.length; i++) {
            frag.appendChild(els[i]);
        }
        return frag;
    },

    spacing: function(group, options, prev) {
        if (group.value === "\\ " || group.value === "\\space") {
            return makeSpan("mord mspace", [textit(group.value)]);
        } else {
            var spacingClassMap = {
                "\\qquad": "qquad",
                "\\quad": "quad",
                "\\;": "thickspace",
                "\\:": "mediumspace",
                "\\,": "thinspace"
            };

            return makeSpan("mord mspace " + spacingClassMap[group.value]);
        }
    },

    llap: function(group, options, prev) {
        var inner = makeSpan("", [buildGroup(group.value, options)]);
        return makeSpan("llap " + options.style.cls(), [inner]);
    },

    rlap: function(group, options, prev) {
        var inner = makeSpan("", [buildGroup(group.value, options)]);
        return makeSpan("rlap " + options.style.cls(), [inner]);
    },

    punct: function(group, options, prev) {
        return makeSpan("mpunct" + options.color, [textit(group.value)]);
    },

    ordgroup: function(group, options, prev) {
        return makeSpan("mord " + options.style.cls(),
            buildExpression(group.value, options)
        );
    },

    namedfn: function(group, options, prev) {
        return makeSpan("mop" + options.color, [textit(group.value.slice(1))]);
    }
};

var buildGroup = function(group, options, prev) {
    if (!group) {
        return makeSpan();
    }

    if (groupTypes[group.type]) {
        return groupTypes[group.type](group, options, prev);
    } else {
        throw new ParseError(
            "Lex error: Got group of unknown type: '" + group.type + "'");
    }
};

var charLookup = {
    "*": "\u2217",
    "-": "\u2212",
    "`": "\u2018",
    "\\ ": "\u00a0",
    "\\$": "$",
    "\\angle": "\u2220",
    "\\cdot": "\u22c5",
    "\\circ": "\u2218",
    "\\colon": ":",
    "\\div": "\u00f7",
    "\\geq": "\u2265",
    "\\gets": "\u2190",
    "\\infty": "\u221e",
    "\\leftarrow": "\u2190",
    "\\leq": "\u2264",
    "\\lvert": "|",
    "\\neq": "\u2260",
    "\\ngeq": "\u2271",
    "\\nleq": "\u2270",
    "\\pm": "\u00b1",
    "\\prime": "\u2032",
    "\\rightarrow": "\u2192",
    "\\rvert": "|",
    "\\space": "\u00a0",
    "\\times": "\u00d7",
    "\\to": "\u2192",

    "\\alpha": "\u03b1",
    "\\beta": "\u03b2",
    "\\gamma": "\u03b3",
    "\\delta": "\u03b4",
    "\\epsilon": "\u03f5",
    "\\zeta": "\u03b6",
    "\\eta": "\u03b7",
    "\\theta": "\u03b8",
    "\\iota": "\u03b9",
    "\\kappa": "\u03ba",
    "\\lambda": "\u03bb",
    "\\mu": "\u03bc",
    "\\nu": "\u03bd",
    "\\xi": "\u03be",
    "\\omicron": "\u03bf",
    "\\pi": "\u03c0",
    "\\rho": "\u03c1",
    "\\sigma": "\u03c3",
    "\\tau": "\u03c4",
    "\\upsilon": "\u03c5",
    "\\phi": "\u03d5",
    "\\chi": "\u03c7",
    "\\psi": "\u03c8",
    "\\omega": "\u03c9",
    "\\varepsilon": "\u03b5",
    "\\vartheta": "\u03d1",
    "\\varpi": "\u03d6",
    "\\varrho": "\u03f1",
    "\\varsigma": "\u03c2",
    "\\varphi": "\u03c6",

    "\\Gamma": "\u0393",
    "\\Delta": "\u0394",
    "\\Theta": "\u0398",
    "\\Lambda": "\u039b",
    "\\Xi": "\u039e",
    "\\Pi": "\u03a0",
    "\\Sigma": "\u03a3",
    "\\Upsilon": "\u03a5",
    "\\Phi": "\u03a6",
    "\\Psi": "\u03a8",
    "\\Omega": "\u03a9"
};

var heightMap = {
  "a": .430554,
  "b": .694444,
  "c": .430554,
  "d": .694444,
  "e": .430554,
  "f": .694444,
  "g": .430554,
  "h": .694444,
  "i": .659525,
  "j": .659525,
  "k": .694444,
  "l": .694444,
  "m": .430554,
  "n": .430554,
  "o": .430554,
  "p": .430554,
  "q": .430554,
  "r": .430554,
  "s": .430554,
  "t": .615079,
  "u": .430554,
  "v": .430554,
  "w": .430554,
  "x": .430554,
  "y": .430554,
  "z": .430554,
  "A": .683331,
  "B": .683331,
  "C": .683331,
  "D": .683331,
  "E": .683331,
  "F": .683331,
  "G": .683331,
  "H": .683331,
  "I": .683331,
  "J": .683331,
  "K": .683331,
  "L": .683331,
  "M": .683331,
  "N": .683331,
  "O": .683331,
  "P": .683331,
  "Q": .683331,
  "R": .683331,
  "S": .683331,
  "T": .683331,
  "U": .683331,
  "V": .683331,
  "W": .683331,
  "X": .683331,
  "Y": .683331,
  "Z": .683331,
  "+": .583333,
  "-": .583333
};

var depthMap = {
  "a": 0,
  "b": 0,
  "c": 0,
  "d": 0,
  "e": 0,
  "f": .194444,
  "g": .194444,
  "h": 0,
  "i": 0,
  "j": .194444,
  "k": 0,
  "l": 0,
  "m": 0,
  "n": 0,
  "o": 0,
  "p": .194444,
  "q": .194444,
  "r": 0,
  "s": 0,
  "t": 0,
  "u": 0,
  "v": 0,
  "w": 0,
  "x": 0,
  "y": .194444,
  "z": 0,
  "A": 0,
  "B": 0,
  "C": 0,
  "D": 0,
  "E": 0,
  "F": 0,
  "G": 0,
  "H": 0,
  "I": 0,
  "J": 0,
  "K": 0,
  "L": 0,
  "M": 0,
  "N": 0,
  "O": 0,
  "P": 0,
  "Q": .194444,
  "R": 0,
  "S": 0,
  "T": 0,
  "U": 0,
  "V": 0,
  "W": 0,
  "X": 0,
  "Y": 0,
  "Z": 0,
  "+": .083333,
  "-": .083333
};

var textit = function(value) {
    // Most things have a depth of 0, and both numbers and capital letters have
    // heights of 0.69, which is why we use those as the defaults.
    var height = (value in heightMap) ? heightMap[value] : 0.69;
    var depth = (value in depthMap) ? depthMap[value] : 0;

    if (value in charLookup) {
        value = charLookup[value];
    }

    var node = document.createTextNode(value);

    node.height = height;
    node.depth = depth;

    return node;
};

var mathit = function(value) {
    var text = textit(value);

    var math = makeSpan("mathit", [text]);

    math.height = text.height;
    math.depth = text.depth;

    return math;
};

var buildTree = function(tree) {
    var options = new Options(Style.TEXT, "");

    var expression = buildExpression(tree, options);
    var span = makeSpan(options.style.cls(), expression);
    var katexNode = makeSpan("katex", [span]);

    return katexNode;
};

module.exports = buildTree;
