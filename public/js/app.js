$(function() {
	var
		$active = $('.active'),
		$loading = $('.loading'),
		$channels = $('.channels'),
		$channelTpl = $channels.find('.template').remove().removeClass('template'),
		playerprefix = 'goodplayer://',
		baseurl = location.protocol+'//'+location.host;

	function buildUrl(channel)
	{
		return playerprefix+baseurl+'/zap/'+escape(channel);
	}

	$.get('/favs.json', function(favs) {
		$.each(favs, function(i, fav) {
			$channel = $channelTpl.clone();

			$channel.data('index', fav.index);
			$channel.find('.link').prop('href', buildUrl(fav.index));
			$channel.find('.icon').prop('src', 'images/channels/'+fav.icon).prop('alt', fav.name);
			$channel.find('.name').text(fav.name);

			$channel.appendTo($channels);
		})

		$loading.hide();
		$channels.show();
	});

	function updateStatus()
	{
		$.get('/status', function(status) {
			if(status[0] == ':')
			{
				// running
				$active.show().find('channel').text(status.substr(1));
			}
		});
	}

	updateStatus();
	setInterval(updateStatus, 1000*5);
});
