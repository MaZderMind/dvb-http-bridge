function strtpl(template, parameter) {
	for(name in parameter)
		template = template.replace(new RegExp('{'+name+'}', 'g'), parameter[name]);

	return template;
}

ll.template = function(key, parameter) {
	return strtpl(ll[key], parameter);
}

$(document).bind('pageinit', function() {
	var isEditingFavs = false;

	$('#channelslist').listview('option', 'filterCallback', function(text, pattern) {
		return pattern.toLowerCase() != text.substr(0, pattern.length).toLowerCase();
	});

	$('#channelslist, #favs').bind('vclick', '.ui-btn', function(e) {
		var
			$a = $(e.target).closest('a'),
			$title = $a.find('.title'),
			channel = $a.data('channel'),
			title = $title.length > 0 ? $title.text() : $a.text();
		
			if($a.length == 0) return;

		var
			$header = $('.header-playing'),
			$headerTxt = $('.header-playing h1, .header-playing-inner h1');

		$headerTxt.text(
			ll.template('tuning', {channel: title}));

		$header.animate({height: 42})
		$.ajax({
			url: '/tune/'+channel,
			dataType: 'json',
			success: function(res) {
				if(res.success) {
					$headerTxt.text(
						ll.template('playing', {channel: title}));

					window.location.href = res.playerurl;
				}
			},
			error: function() {
				$header.animate({height: 0}, {chain: true});
				$('#error-popup').popup('open');
			}
		});
	});
});
