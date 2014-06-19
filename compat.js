/**
 * The compat module adds support for WD.js 0.2.2 APIs to Leadfoot.
 *
 * @deprecated Use the standard Leadfoot APIs.
 * @module leadfoot/compat
 */

var Command = require('./Command');
var Promise = require('dojo/Promise');
var pollUntil = require('./helpers/pollUntil');
var strategies = require('./lib/strategies');
var topic = require('dojo/topic');

/**
 * Deprecates `fromMethod` for `toMethod` and returns the correct call to `toMethod`.
 *
 * @private
 * @param {string} fromMethod
 * @param {string} toMethod
 * @returns {Function}
 */
function deprecate(fromMethod, toMethod) {
	return function () {
		warn('Command#' + fromMethod, 'Command#' + toMethod);
		return this[toMethod].apply(this, arguments);
	};
}

/**
 * Deprecates the element context signature of a method and returns a new command with the correct call to
 * `toMethod` on the element.
 *
 * @private
 * @param {string} fromMethod
 * The name of the old method.
 *
 * @param {string=} toMethod
 * The name of the replacement method on the element, if it is different than the name of the old method. If
 * omitted, it is assumed that the method name
 *
 * @param {Function=} fn
 * An optional function that will be invoked in lieu of a call to the original method if a non-element signature
 * is used.
 *
 * @returns {Function}
 */
function deprecateElementSig(fromMethod, toMethod, fn) {
	return function (element) {
		if (element && element.elementId) {
			warn('Command#' + fromMethod + '(element)', 'Command#find then Command#' + fromMethod + ', or ' +
				'Command#find then Command#then(function (element) { return element.' +
				(toMethod || fromMethod) + '(); }');

			var args = Array.prototype.slice.call(arguments, 1);
			return new Command(this, function () {
				return element[toMethod || fromMethod].apply(this, args);
			});
		}

		return fn ? fn.apply(this, arguments) : Command.prototype[fromMethod].apply(this, arguments);
	};
}

/**
 * Deprecates the element context signature of a method as well as its non-element signature to go to `toMethod`.
 *
 * @private
 * @param {string} fromMethod
 * @param {string} toMethod
 * @returns {Function}
 */
function deprecateElementAndStandardSig(fromMethod, toMethod) {
	return deprecateElementSig(fromMethod, toMethod, deprecate(fromMethod, toMethod));
}

function elementIfExists(using, value) {
	return this.find(using, value).catch(function () {});
}

function elementOrNull(using, value) {
	return this.find(using, value).catch(function () {
		return null;
	});
}

function hasElement(using, value) {
	return this.find(using, value).then(function () {
		return true;
	}, function () {
		return false;
	});
}

function waitForElement(using, value, timeout) {
	return this.getFindTimeout().then(function (originalTimeout) {
		return this.setFindTimeout(timeout)
			.find(using, value)
			.then(function (element) {
				return this.setFindTimeout(originalTimeout).then(function () {
					return element;
				});
			}, function (error) {
				return this.setFindTimeout(originalTimeout).then(function () {
					throw error;
				});
			});
	});
}

function waitForVisible(using, value, timeout) {
	var startTime = Date.now();
	return this.getFindTimeout().then(function (originalTimeout) {
		return this.setFindTimeout(timeout)
			.find(using, value)
			.then(function (element) {
				return pollUntil(function (element) {
					return element.offsetWidth && element.offsetHeight ? true : null;
				}, [ element ], timeout - (startTime - Date.now())).call(this);
			}).then(function (isVisible) {
				return this.setFindTimeout(originalTimeout).then(function () {
					if (!isVisible) {
						throw new Error('Element didn\'t become visible');
					}
				});
			}, function (error) {
				return this.setFindTimeout(originalTimeout).then(function () {
					throw error;
				});
			});
	});
}

/**
 * Warns a user once that the method given by `name` is deprecated.
 *
 * @private
 * @method
 * @param {string} name The name of the old method.
 * @param {string=} replacement Replacement instructions, if a direct replacement for the old method exists.
 * @param {string=} extra Extra information about the deprecation.
 */
var warn = (function () {
	var warned = {};
	return function (name, replacement, extra) {
		if (warned[name]) {
			return;
		}

		warned[name] = true;
		topic.publish('/deprecated', name, replacement, extra);
	};
})();

var methods = {
	get sessionID() {
		warn('Command#sessionID', 'the Command#session.sessionId property');
		return this.session.sessionId;
	},
	status: function () {
		warn('Command#status');
		return new Command(this, function () {
			return this.session.server.getStatus();
		});
	},
	init: function () {
		warn('Command#init');
		return this;
	},
	sessions: function () {
		warn('Command#sessions');
		return new Command(this, function () {
			return this.session.server.getSessions();
		});
	},
	sessionCapabilities: function () {
		warn('Command#sessionCapabilities', 'the Command#session.capabilities property');
		return new Command(this, function () {
			return this.session.capabilities;
		});
	},
	altSessionCapabilities: function () {
		warn('Command#altSessionCapabilities', 'the Command#session.capabilities property');
		return new Command(this, function () {
			return this.session.capabilities;
		});
	},
	getSessionId: function () {
		warn('Command#getSessionId', 'the Command#session.sessionId property');
		return new Command(this, function () {
			return this.session.sessionId;
		});
	},
	getSessionID: function () {
		warn('Command#getSessionID', 'the Command#session.sessionId property');
		return new Command(this, function () {
			return this.session.sessionId;
		});
	},
	setAsyncScriptTimeout: deprecate('setAsyncScriptTimeout', 'setExecuteAsyncTimeout'),
	setWaitTimeout: deprecate('setWaitTimeout', 'setFindTimeout'),
	setImplicitWaitTimeout: deprecate('setImplicitWaitTimeout', 'setFindTimeout'),
	windowHandle: deprecate('windowHandle', 'getCurrentWindowHandle'),
	windowHandles: deprecate('windowHandles', 'getAllWindowHandles'),
	url: deprecate('url', 'getCurrentUrl'),
	forward: deprecate('forward', 'goForward'),
	back: deprecate('back', 'goBack'),
	safeExecute: deprecate('safeExecute', 'execute'),
	eval: function (code) {
		warn('Command#eval', 'Command#execute with a return call');
		return this.execute('return eval(arguments[0]);', [ code ]);
	},
	safeEval: function (code) {
		warn('Command#safeEval', 'Command#execute with a return call');
		return this.execute('return eval(arguments[0]);', [ code ]);
	},
	safeExecuteAsync: deprecate('safeExecuteAsync', 'executeAsync'),
	frame: deprecate('frame', 'switchToFrame'),
	window: deprecate('window', 'switchToWindow'),
	close: deprecate('close', 'closeCurrentWindow'),
	windowSize: deprecate('windowSize', 'setWindowSize'),
	setWindowSize: function () {
		var args = Array.prototype.slice.call(arguments, 0);

		if (args.length === 3 && typeof args[0] === 'number') {
			warn('Command#setWindowSize(width, height, handle)',
				'Command#setWindowSize(handle, width, height)');
			args.unshift(args.pop());
		}

		return Command.prototype.setWindowSize.apply(this, args);
	},
	setWindowPosition: function () {
		var args = Array.prototype.slice.call(arguments, 0);

		if (args.length === 3 && typeof args[0] === 'number') {
			warn('Command#setWindowPosition(x, y, handle)',
				'Command#setWindowPosition(handle, x, y)');
			args.unshift(args.pop());
		}

		return Command.prototype.setWindowPosition.apply(this, args);
	},
	maximize: deprecate('maximize', 'maximizeWindow'),
	allCookies: deprecate('allCookies', 'getCookies'),
	deleteAllCookies: deprecate('deleteAllCookies', 'clearCookies'),
	source: deprecate('source', 'getPageSource'),
	title: deprecate('title', 'getPageTitle'),
	element: deprecate('element', 'find'),
	elementByClassName: deprecate('elementByClassName', 'findByClassName'),
	elementByCssSelector: deprecate('elementByCssSelector', 'findByCssSelector'),
	elementById: deprecate('elementById', 'findById'),
	elementByName: deprecate('elementByName', 'findByName'),
	elementByLinkText: deprecate('elementByLinkText', 'findByLinkText'),
	elementByPartialLinkText: deprecate('elementByPartialLinkText', 'findByPartialLinkText'),
	elementByTagName: deprecate('elementByTagName', 'findByTagName'),
	elementByXPath: deprecate('elementByXPath', 'findByXpath'),
	elementByCss: deprecate('elementByCss', 'findByCssSelector'),
	elements: deprecate('elements', 'findAll'),
	elementsByClassName: deprecate('elementsByClassName', 'findAllByClassName'),
	elementsByCssSelector: deprecate('elementsByCssSelector', 'findAllByCssSelector'),
	elementsById: function (value) {
		warn('Command#elementsById', 'Command#findById');
		return this.findAll('id', value);
	},
	elementsByName: deprecate('elementsByName', 'findAllByName'),
	elementsByLinkText: deprecate('elementsByLinkText', 'findAllByLinkText'),
	elementsByPartialLinkText: deprecate('elementsByPartialLinkText', 'findAllByPartialLinkText'),
	elementsByTagName: deprecate('elementsByTagName', 'findAllByTagName'),
	elementsByXPath: deprecate('elementsByXPath', 'findAllByXpath'),
	elementsByCss: deprecate('elementsByCss', 'findAllByCssSelector'),
	elementOrNull: function () {
		warn('Command#elementOrNull', 'Command#find and Command#always, or Command#findAll');
		return elementOrNull.apply(this, arguments);
	},
	elementIfExists: function () {
		warn('Command#elementIfExists', 'Command#find and Command#always, or Command#findAll');
		return elementIfExists.apply(this, arguments);
	},
	hasElement: function () {
		warn('Command#hasElement', 'Command#find and Command#then(exists, doesNotExist)');
		return hasElement.apply(this, arguments);
	},
	active: deprecate('active', 'getActiveElement'),
	clickElement: deprecateElementSig('clickElement', 'click'),
	submit: deprecateElementSig('submit'),
	text: deprecateElementAndStandardSig('text', 'getVisibleText'),

	// This method had a two-argument version according to the WD.js docs but they inexplicably swapped the first
	// and second arguments so it probably never would have worked properly in Intern
	textPresent: function (searchText, element) {
		warn('Command#textPresent', 'Command#getVisibleText and a promise helper');

		function test(text) {
			return text.indexOf(searchText) > -1;
		}

		if (element) {
			return new Command(this, function () {
				return element.getVisibleText().then(test);
			});
		}

		return this.getVisibleText().then(test);
	},

	// This is not backwards-compatible because it is impossible to know whether someone is expecting this to
	// work like the old element `type` because they have not converted their code yet, or like the new session
	// `type` because they have
	type: deprecateElementSig('type', 'type'),

	keys: deprecate('keys', 'type'),
	getTagName: deprecateElementSig('getTagName'),
	clear: deprecateElementAndStandardSig('clear', 'clearValue'),
	isSelected: deprecateElementSig('isSelected'),
	isEnabled: deprecateElementSig('isEnabled'),
	enabled: deprecateElementAndStandardSig('enabled', 'isEnabled'),
	getAttribute: deprecateElementSig('getAttribute'),
	getValue: function (element) {
		if (element && element.elementId) {
			warn('Command#getValue(element)', 'Command#find then Command#getAttribute(\'value\'), or ' +
				'Command#find then Command#then(function (element) { ' +
				'return element.getAttribute(\'value\'); }');

			return new Command(this, function () {
				return element.getAttribute('value');
			});
		}

		warn('Command#getValue', 'Command#find then Command#getAttribute(\'value\')');
		return this.getAttribute('value');
	},
	equalsElement: function (element, other) {
		if (other && other.elementId) {
			warn('Command#equalsElement(element, other)', 'element.equals(other)');
			return new Command(this, function () {
				return element.equals(other);
			});
		}

		warn('Command#equalsElement', 'Command#equals');
		return this.equals(element);
	},
	isDisplayed: deprecateElementSig('isDisplayed'),
	displayed: deprecateElementAndStandardSig('displayed', 'isDisplayed'),
	getLocation: deprecateElementAndStandardSig('getLocation', 'getPosition'),
	getLocationInView: function () {
		warn(
			'Command#getLocationInView',
			'Command#getPosition',
			'This command is defined in the spec as internal and should never have been exposed to end users. ' +
			'The returned value of this command will be the same as Command#getPosition, which may not match ' +
			'prior behaviour.'
		);

		return this.getPosition.apply(this, arguments);
	},
	getSize: deprecateElementSig('getSize'),
	getComputedCss: deprecateElementAndStandardSig('getComputedCss', 'getComputedStyle'),
	getComputedCSS: deprecateElementAndStandardSig('getComputedCSS', 'getComputedStyle'),
	alertText: deprecate('alertText', 'getAlertText'),
	alertKeys: deprecate('alertKeys', 'typeInPrompt'),
	moveTo: deprecateElementAndStandardSig('moveTo', 'moveMouseTo'),
	click: deprecateElementSig('click'),
	buttonDown: deprecate('buttonDown', 'pressMouseButton'),
	buttonUp: deprecate('buttonUp', 'releaseMouseButton'),
	doubleclick: deprecate('doubleclick', 'doubleClick'),
	// TODO: There is no tap on elements
	tapElement: deprecateElementSig('tapElement', 'tap'),
	// TODO: There is no flick on elements
	flick: deprecate('flick', 'flickFinger'),
	setLocalStorageKey: deprecate('setLocalStorageKey', 'setLocalStorageItem'),
	getLocalStorageKey: deprecate('getLocalStorageKey', 'getLocalStorageItem'),
	removeLocalStorageKey: deprecate('removeLocalStorageKey', 'deleteLocalStorageItem'),
	log: deprecate('log', 'getLogsFor'),
	logTypes: deprecate('logTypes', 'getAvailableLogTypes'),
	newWindow: function (url, name) {
		warn('Command#newWindow', 'Command#execute');
		return this.execute('window.open(arguments[0], arguments[1]);', [ url, name ]);
	},
	windowName: function () {
		warn('Command#windowName', 'Command#execute');
		return this.execute('return window.name;');
	},
	setHTTPInactivityTimeout: function () {
		warn('Command#setHTTPInactivityTimeout');
		return this;
	},
	getPageIndex: function (element) {
		warn('Command#getPageIndex', null, 'This command is not part of any specification.');
		if (element && element.elementId) {
			return new Command(this, function () {
				return element._get('pageIndex');
			});
		}

		return new Command(this, function () {
			if (this.context.isSingle) {
				return this.context[0]._get('pageIndex');
			}
			else {
				return Promise.all(this.context.map(function (element) {
					return element._get('pageIndex');
				}));
			}
		});
	},
	uploadFile: function () {
		warn(
			'Command#uploadFile',
			'Command#type to type a file path into a file upload form control',
			'This command is not part of any specification. This command is a no-op.'
		);

		return this;
	},
	waitForCondition: function (expression, timeout, pollInterval) {
		timeout = timeout || 1000;
		pollInterval = pollInterval || 100;

		warn('Command#waitForCondition', 'Command#executeAsync or leadfoot/helpers/pollUntil');

		return this.then(pollUntil('return eval(arguments[0]) ? true : null;', [ expression ], timeout, pollInterval));
	},
	waitForConditionInBrowser: function (expression, timeout, pollInterval) {
		timeout = timeout || 1000;
		pollInterval = pollInterval || 100;

		warn('Command#waitForConditionInBrowser', 'Command#executeAsync or leadfoot/helpers/pollUntil');

		return this.then(pollUntil('return eval(arguments[0]) ? true : null;', [ expression ], timeout, pollInterval));
	},
	sauceJobUpdate: function () {
		warn(
			'Command#sauceJobUpdate',
			null,
			'This command is not part of any specification. This command is a no-op.'
		);

		return this;
	},
	sauceJobStatus: function () {
		warn(
			'Command#sauceJobStatus',
			null,
			'This command is not part of any specification. This command is a no-op.'
		);

		return this;
	},
	waitForElement: function () {
		warn(
			'Command#waitForElement',
			'Command#setFindTimeout and Command#find',
			'This command is implemented using implicit timeouts, which may not match the prior behaviour.'
		);
		return waitForElement.apply(this, arguments);
	},
	waitForVisible: function () {
		warn(
			'Command#waitForVisible',
			null,
			'This command is partially implemented using implicit timeouts, which may not match the prior ' +
			'behaviour.'
		);
		return waitForVisible.apply(this, arguments);
	},
	isVisible: function () {
		warn(
			'Command#isVisible',
			'Command#isDisplayed',
			'This command is implemented using Command#isDisplayed, which may not match the prior behaviour.'
		);

		if (arguments.length === 2) {
			var using = arguments[0];
			var value = arguments[1];
			return this.find(using, value).isDisplayed().catch(function () {
				return false;
			});
		}
		else if (arguments.length === 1) {
			var element = arguments[0];
			if (element && element.elementId) {
				return new Command(this, function () {
					return element.isDisplayed();
				});
			}
		}

		return new Command(this, function () {
			if (this.context.isSingle) {
				return this.context[0].isDisplayed();
			}
			else {
				return Promise.all(this.context.map(function (element) {
					return element.isDisplayed();
				}));
			}
		});
	},
	otherwise: deprecate('otherwise', 'catch'),
	always: deprecate('always', 'finally')
};

// TODO: type -> typeElement

strategies.suffixes.forEach(function (suffix, index) {
	function addStrategy(method, toMethod, suffix, wdSuffix, using) {
		methods[method + 'OrNull'] = function (value) {
			return this.elementOrNull(using, value);
		};

		methods[method + 'IfExists'] = function (value) {
			return this.elementIfExists(using, value);
		};

		methods['hasElementBy' + wdSuffix] = function (value) {
			return this.hasElement(using, value);
		};

		methods['waitForElementBy' + wdSuffix] = function (value, timeout) {
			return this.waitForElement(using, value, timeout);
		};

		methods['waitForVisibleBy' + wdSuffix] = function (value, timeout) {
			return this.waitForVisible(using, value, timeout);
		};
	}

	var wdSuffix = suffix === 'Xpath' ? 'XPath' : suffix;
	var method = 'elementBy' + wdSuffix;
	var toMethod = 'findBy' + suffix;
	var using = strategies[index];
	addStrategy(method, toMethod, suffix, wdSuffix, using);
	if (suffix === 'CssSelector') {
		addStrategy('elementByCss', toMethod, suffix, 'Css', using);
	}
});

module.exports = {
	/**
	 * Applies the methods from compat to a {@link module:leadfoot/Command} prototype or instance.
	 *
	 * @param {module:leadfoot/Command} prototype A {@link module:leadfoot/Command} prototype or instance.
	 */
	applyTo: function (prototype) {
		for (var key in methods) {
			Object.defineProperty(prototype, key, Object.getOwnPropertyDescriptor(methods, key));
		}
	}
};
