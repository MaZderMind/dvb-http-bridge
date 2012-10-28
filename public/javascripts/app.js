$(function() {
	var isEditingFavs = false;

	$('#channelslist').listview('option', 'filterCallback', function(text, pattern) {
		return pattern.toLowerCase() != text.substr(0, pattern.length).toLowerCase();
	});

	$('#editbtn').on('vclick', function(e) {
		e.preventDefault();
		e.stopPropagation();
		isEditingFavs = $(this)
			.toggleClass($.mobile.activeBtnClass)
			.hasClass($.mobile.activeBtnClass);
		
		$('#channelslist .ui-icon')
			.toggleClass('ui-icon-star', isEditingFavs);
	});

	$('#channelslist').bind('vclick', '.ui-btn', function(e) {
		if(isEditingFavs) {
			alert('add to fav');
		}
	});
});
