function strtpl(template, parameter) {
	for(name in parameter)
		template = template.replace(new RegExp('{'+name+'}', 'g'), parameter[name]);

	return template;
}

ll.template = function(key, parameter) {
	return strtpl(ll[key], parameter);
}

$(document).bind('pageinit', function() {
	var
		isEditingFavs = false,
		$header = $('#header .playing'),
		$headerTxt = $('#header .playing h1');


	if(tuningStatus.isTuned) {
		$header.css('height', 42);
		$headerTxt.text(
			ll.template('playing', {channel: tuningStatus.name}));
	}

	$('#channelslist').listview('option', 'filterCallback', function(text, pattern) {
		return pattern.toLowerCase() != text.substr(0, pattern.length).toLowerCase();
	});

	$('#header .playing').click(function() {
		window.location.href = playerUrl;
	});

	$('#channelslist, #favs').bind('vclick', '.ui-btn', function(e) {
		var $a = $(e.target).closest('a');
		if($a.length == 0) return;

		var
			$title = $a.find('.title'),
			channel = $a.data('channel'),
			name = $title.length > 0 ? $title.text() : $a.text();

		$headerTxt.text(
			ll.template('tuning', {channel: name}));

		$header.animate({height: 42})
		$.ajax({
			url: '/tune/'+channel,
			dataType: 'json',
			timeout: 2000,
			success: function(res) {
				if(res.success) {
					$headerTxt.text(
						ll.template('playing', {channel: name}));

					tuningStatus.name = res.name;
					tuningStatus.idx = res.idx;
					tuningStatus.isTuned = true;

					window.location.href = playerUrl;
				}
				else {
					$header.animate({height: 0}, {chain: true});

					delete tuningStatus.name;
					delete tuningStatus.idx;
					tuningStatus.isTuned = false;

					$('#error-popup').popup('open');
				}
			},
			error: function() {
				$header.animate({height: 0}, {chain: true});
				$('#error-popup').popup('open');
			}
		});
	});
});
