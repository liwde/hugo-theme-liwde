var summaryInclude = [60, 160]; // before, after

var idx;
var pages;
var ready = $.getJSON("/index.json", function(data) {
  pages = data;
  idx = lunr(function () {
    this.use(lunr.multiLanguage('de', 'en'));
    this.field('title', { boost: 10 });
    this.field('subtitle', { boost: 5 });
    this.field('categories');
    this.field('series');
    this.field('contents');
    this.ref('idx');
    this.metadataWhitelist = ['position']
    data.forEach(function(page, i) {
      page.idx = i;
      this.add(page);
    }, this);
  });
});

function initialSearch() {
  var query = getQuery();
  $('#search-query').val(query);
  ready.then(function() {
    executeSearch(query, idx);
  });
  $('#search-query').focus();
}

function liveSearch() {
  var query = $('#search-query').val();
  window.location.hash = "#q=" + encodeURIComponent(query);
  executeSearch(query, idx);
}

function executeSearch(query, idx) {
  $('#search-results').html('');

  if (!query) return;

  var results = idx.search(query);

  if (results.length === 0) {
    $('#search-results').html('<p>Keine passenden Beiträge gefunden</p>');
  }

  results.forEach(function(result, i) {
    var page = pages[result.ref];
    var snippet = generateSnippet(page.contents, result.matchData.metadata);
    var toHighlight = Object.keys(result.matchData.metadata);
    
    //pull template from hugo template definition
    var templateDefinition = $('#search-result-template').html();
    //replace values
    var output = render(templateDefinition, {
      key: i,
      title: page.title,
      subtitle: page.subtitle,
      link: page.permalink,
      series: page.series,
      categories: page.categories,
      snippet: snippet
    });
    $('#search-results').append(output);
    $("#summary-" + i).mark(query);
    toHighlight.forEach(function(token) {
      $("#summary-" + i).mark(token);
    });
  });
}
function generateSnippet(contents, matchMetadata) {
  var firstToken = Object.keys(matchMetadata)[0];
  var position = matchMetadata[firstToken].contents && matchMetadata[firstToken].contents.position[0] // just use the first snippet of the first
  var start, end;
  if (position) {
    start = Math.max(0, position[0] - summaryInclude[0]);
    end = Math.min(position[0] + position[1] + summaryInclude[1], contents.length);
  } else {
    start = 0;
    end = Math.min(summaryInclude[0] + summaryInclude[1], contents.length);
  }
  var snippet = nicerSubstring(contents, start, end);
  if (start !== 0) snippet = "… " + snippet;
  if (end !== contents.length) snippet += " …";
  return snippet;
}

function nicerSubstring(str, start, end) {
  str = str.substring(start, end);
  //re-trim if we are in the middle of a word
  str = str.substring(Math.max(0, str.indexOf(" ")) + 1, Math.min(str.length, str.lastIndexOf(" ")));
  return str;
}

function getQuery() {
  var q = location.hash.match(/q=(.*)/);
  return q ? decodeURIComponent(q[1]) : '';
}

function render(templateString, data) {
  var conditionalMatches, conditionalPattern, copy;
  conditionalPattern = /\$\{\s*isset ([a-zA-Z]*) \s*\}(.*)\$\{\s*end\s*}/g;
  //since loop below depends on re.lastInxdex, we use a copy to capture any manipulations whilst inside the loop
  copy = templateString;
  while ((conditionalMatches = conditionalPattern.exec(templateString)) !== null) {
    if (data[conditionalMatches[1]]) {
      //valid key, remove conditionals, leave contents.
      copy = copy.replace(conditionalMatches[0], conditionalMatches[2]);
    } else {
      //not valid, remove entire section
      copy = copy.replace(conditionalMatches[0], '');
    }
  }
  templateString = copy;
  //now any conditionals removed we can do simple substitution
  var key, find, re;
  for (key in data) {
    find = '\\$\\{\\s*' + key + '\\s*\\}';
    re = new RegExp(find, 'g');
    templateString = templateString.replace(re, data[key]);
  }
  return templateString;
}

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

window.addEventListener("load", function() {
  initialSearch();
});

var debouncedLiveSearch = debounce(liveSearch, 300);
