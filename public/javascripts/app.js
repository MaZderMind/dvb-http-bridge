$(function() {
	var isEditingFavs = false;

	$('#channelslist').listview('option', 'filterCallback', function(text, pattern) {
		return pattern.toLowerCase() != text.substr(0, pattern.length).toLowerCase();
	});

	$('#channelslist, #favs').bind('vclick', '.ui-btn', function(e) {
		var
			$btn = $(e.target).closest('.ui-btn');
			$logo = $btn.find('.logo img');

		var $content = $('#channel div[data-role=content]');
		if($logo.length > 0)
			$content.find('img').attr('src', $logo.attr('src')).css({'display': 'block'});
		else
			$content.find('img').css({'display': 'none'});
	});

	$('#channel').bind({
		create: function(event, ui) {
			console.log('onCreate');
		}
	});
});
