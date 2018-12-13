
NodeList.prototype.filter = Array.prototype.filter;

let hovered_diff;
let pr = getParam('pull');
let preventStoring = false;
var mutationObserver;
var savedHighlights = getLocalStorageParam('savedHighlights');
var closedDiffs = getLocalStorageParam('closedDiffs');

applyHeaderStyles();
initSavedHighlights(document);
initClosedDiffs(document);
observeLazyLoadedDiffs();

document.querySelectorAll('.js-details-container').forEach((item) => {
    assignMouseListeners(item);
    assignArrowClickListener(item);
});

chrome.extension.onMessage.addListener(function(msg) {
    if (msg.action == 'toggle-diff-bookmark' && hovered_diff !== null) {
        let color = hovered_diff
            .querySelector('.js-details-target')
            .style.background == 'rgb(223, 255, 0)'
                ? 'transparent'
                : 'rgb(223, 255, 0)';

        hovered_diff.querySelector('.js-details-target').style.background = color;

        let diffTitle = hovered_diff.querySelector('.file-info a').getAttribute('title');

        if (color == 'rgb(223, 255, 0)') {
            addToStorage('savedHighlights', diffTitle);
        } else {
            removeFromStorage('savedHighlights', diffTitle);
        }
    }

    if (msg.action == 'toggle-diff-state' && hovered_diff !== null) {
        hovered_diff.querySelector('.js-details-target').click();
    }
});

function initSavedHighlights(element) {
    if (savedHighlights) {
        savedHighlights.forEach(function (value) {
            let highlight = element.querySelector('.file-info a[title="'+value+'"]');

            if (highlight) {
                highlight.closest('.js-details-container')
                    .querySelector('.js-details-target')
                    .style.background = 'rgb(223, 255, 0)';
            }
        });
    }
}

function initClosedDiffs(element) {
    if (closedDiffs) {
        preventStoring = true;

        closedDiffs.forEach(function (value, key) {
            let link = element.querySelector('.file-info a[title="'+value+'"]');
            if (link) {
                link.closest('.js-details-container')
                    .querySelector('.js-details-target')
                    .click();
            }

            if (key + 1 == closedDiffs.length) {
                preventStoring = false;
            }
        });
    }
}

function getParam(param) {
    let paramValue = null;
    let list = window.location.pathname.split('/');

    list.forEach(function(value, key) {
        if (value == param) {
            paramValue = list[key + 1];
        }
    });

    return paramValue;
}

function getLocalStorageParam(param) {
    return JSON.parse(window.localStorage.getItem(`${param}.${pr}`));
}

function setLocalStorageParam(param, value) {
    window.localStorage.setItem(`${param}.${pr}`, JSON.stringify(value));
}

function addToStorage(storageKey, value) {
    let list = getLocalStorageParam(storageKey);

    if (list !== null) {
        list.push(value);
    } else {
        list = [value];
    }

    setLocalStorageParam(storageKey, list);
}

function removeFromStorage(storageKey, itemValue) {
    let list = getLocalStorageParam(storageKey);

    list = list.filter(function(value){
        return value != itemValue;
    });

    setLocalStorageParam(storageKey, list);
}

function adjustScrolling(amount) {
    document.querySelector('html').scrollTop += amount;
}

function assignMouseListeners(element) {
    element.addEventListener('mouseenter', selectDiff);
    element.addEventListener('mouseleave', resetSelectedDiff);
}

function assignArrowClickListener(item) {
    let arrow = item.querySelector('.js-details-target');
    if (arrow) {
        arrow.addEventListener('click', toggleDiffandUpdateStorage);
    }
}

function applyHeaderStyles() {
    var ref = document.querySelector('script');
    var style = document.createElement('style');

    style.innerHTML =
        '.file-header.file-header--expandable.js-file-header {' +
            'position: sticky;' +
            'top: 60px;' +
            'z-index: 10;' +
        '}';

    ref.parentNode.insertBefore(style, ref);
}

function selectDiff() {
    if (! this.classList.contains('selectedDiff')) {
        this.classList.add('selectedDiff');
        hovered_diff = this;
    }
}

function toggleDiffandUpdateStorage() {
    let container = this.closest('.js-details-container');
    let diffTitle = container.querySelector('.file-info a').getAttribute('title');

    if (container.classList.contains('open')) {
        if (preventStoring == false) {
            addToStorage('closedDiffs', diffTitle);
        }

        let selectedDiff = document.querySelector('.selectedDiff');
        if (selectedDiff) {
            let nextDiff = selectedDiff.findSiblingByClass('open');
            if (! nextDiff) {
                let nextSet = selectedDiff
                    .closest('.js-diff-progressive-container')
                    .findSiblingByClass('.js-diff-progressive-container');

                if (nextSet && nextSet.querySelector('.js-details-container.open').length) {
                    nextDiff = nextSet.querySelector('.js-details-container.open');
                }
            }

            if (nextDiff) {
                nextDiff.scrollIntoView({block: "start"});
                adjustScrolling(-50);
            }
        }
    } else {
        if (preventStoring == false) {
            removeFromStorage('closedDiffs', diffTitle);
        }
        container.scrollIntoView({block: "start"});

    }
}

function resetSelectedDiff () {
    if (this.classList.contains('selectedDiff')) {
        hovered_diff = null;
        let selected = document.querySelector('.selectedDiff');
        if (selected) {
            selected.classList.remove('selectedDiff');
        }
    }
}

function observeLazyLoadedDiffs() {
    // setup the observer
    mutationObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes
                    .filter(addedNode => addedNode.nodeName == "DIV")
                    .forEach(function (item) {
                        assignMouseListeners(item);
                        assignArrowClickListener(item);
                        initSavedHighlights(item);
                        initClosedDiffs(item);
                    });
            }
        });
    });

    // set the observer to run on files container
    mutationObserver.observe(document.querySelector('#files'), {
        childList: true,
        subtree: true,
    });

    // kill observer after 5 secs
    setTimeout(function() {
        mutationObserver.disconnect();
    }, 5000);
}

HTMLElement.prototype.findSiblingByClass = function(str) {
    let nextElement = this.nextElementSibling;

    if (nextElement) {
        if (nextElement.classList.contains(str)) {
            return nextElement;
        }

        return nextElement.findSiblingByClass(str);
    }

    return null;
};
