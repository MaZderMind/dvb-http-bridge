$(function() {
	var $tbody = $('table tbody')
	$.get('/schedule.json', function(schedule) {
		$tbody.empty();

		$.each(schedule, function (idx, item) {
			$('<tr>')
				.append( $('<td>').text(item.name) )
				.append( $('<td>').text(item.channel) )
				.append( $('<td>').text(item.duration+" min") )
				.append( $('<td>').text(item.date) )
				.appendTo($tbody);
		})
	});
});
