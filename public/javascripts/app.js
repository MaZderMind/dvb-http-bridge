$(function() {
	$('#channelslist').listview('option', 'filterCallback', function(text, pattern) {
		return pattern.toLowerCase() != text.substr(0, pattern.length).toLowerCase();
	});

	$('#editbtn').on('click', function(e) {
		e.preventDefault();
	});
});
