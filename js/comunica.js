function setOptions () {
	var checkAndDo = function (radio, f) {
		return ($(radio).is(":checked")) ? f(radio) : null;
	}

	$("#tts").change(function (ev) {
		checkAndDo(this, function (r) {
			$("#sr").prop('tabindex', -1);
			$("#tts").prop('tabindex', 0);
			$("#tts-controls").show();
			$("#sr-controls").hide();
			$(".tts-controls div").removeClass('invisible');
			$('.tts-controls select').prop('disabled', false);
			$(".sr-controls").hide();
		});
	});

	$("#sr").change(function (ev) {
		checkAndDo(this, function (r) {
			$("#sr").prop('tabindex', 0);
			$("#tts").prop('tabindex', -1);
			$("#sr-controls").show();
			$("#tts-controls").hide();
			$(".sr-controls").show();
			$(".tts-controls div").addClass('invisible');
			$('.tts-controls select').prop('disabled', true);
			$("#text").val("");
		});
	});

} 

function setSpeakFunction (voices) {
	$("#speak").click(function (ev) {
		var textVal = $("#text").val();
		if (textVal === null || textVal === "") return;

		var msg = new SpeechSynthesisUtterance(textVal);
		msg.volume = 1;
		msg.voice = voices[$("#voice").val()];
		//msg.pitch = 0;

		msg.onend = function (event) {
			$("#speak-control-stop-me-if-you-can").hide();
			$("#speak").show();
		};
		window.speechSynthesis.speak(msg);

		$(this).hide();
		$("#speak-control-stop-me-if-you-can").show();
	});

	$("#stop-speak").click(function () {
		$("#speak-control-stop-me-if-you-can").hide();
		$("#speak").show();
		window.speechSynthesis.cancel();
	});

	// $("#pause-speak").click(function () {
		
	// });
}

function setAccessibilityFunctions () {
	document.cookie = "font-normal-size=" + $("html").css("fontSize");

	$("#font-up").click(function () {
		var valueFontSize = toNumber($("html").css("fontSize"));
		$("html").css({fontSize: toPx(valueFontSize + 1)});
	});

	$("#font-down").click(function () {
		var valueFontSize = toNumber($("html").css("fontSize"));
		$("html").css({fontSize: toPx(valueFontSize - 1)});
	});

	$("#font-normal").click(function () {
		$("html").css({fontSize: getCookieValue("font-normal-size")});
	});	

	$("#high-contrast").click(function () {
		$("body").prop('class', "alto-contraste");
	});

	$("#sepia-contrast").click(function () {
		$("body").prop('class', "sepia");
	});

	$("#normal-contrast").click(function () {
		$("body").prop('class', "");
	});
}

function getCookieValue(name) {
	var valueMatch = new RegExp(name + "=(.+?)(;|$)", "");
	var results = document.cookie.match(valueMatch);

	return results[1];
}

function toNumber (string) {
	return parseInt(string.replace(/[^\d\-\.]/g, ""), 10);
}

function toPx (intValue) {
	return intValue + "px";
}

function animate(elem, xAxisMax, xAxisMin) {
	var timeId = null;
	var step = 1;
	$(elem).css({left: "0px"});
	return {
		start: function () {
			var self = this;
			timeId = setTimeout(function () {
				var cleft = toNumber($(elem).css("left"));
				step = (cleft == xAxisMax || cleft == xAxisMin) ? step * -1 : step; 
				$(elem).css({left: toPx(cleft + step)});
				///console.log("move:" + $(elem).css("left"));
				self.start();
			}, 50);

			return true;
		},	

		end: function () {
			if (timeId != null) {
				clearTimeout(timeId);
				timeId = null;
				$(elem).css({left: "0px"});
				return true;
			}

			return false;
		}

	};
}

function speechRecognitionAPI () {
	return window.webkitSpeechRecognition || window.SpeechRecognition;
}

function testAPIAvailability (f_yes, f_no) {
	return (speechRecognitionAPI() == null) ? f_no() : f_yes();	
}

function evalTranscript (string) {
	var substitution = {
		"ponto de interrogação" : "?",
		"ponto de exclamação" : "!",
		"vírgula": ",",
		"ponto final": ".",
		"ponto e vírgula": ";",
		"reticências" : "...",
		"nova linha" : "\n"
	};

	console.log(string);

	return (substitution[string.toLowerCase().trim()] || string);
}

function loadVoices (f) {
	if (loadVoices.voices !== undefined) {
		return f(loadVoices.voices);
	} else {
		if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1){
			window.speechSynthesis.onvoiceschanged = function () {
				var voices = window.speechSynthesis.getVoices();
				loadVoices.voices = voices;
				window.speechSynthesis.onvoiceschanged = null;
				f(voices);
			}
		} else {
			var voices = window.speechSynthesis.getVoices();
			loadVoices.voices = voices;
			f(voices);
		}

		return null;
	}
}

$(document).ready(function () {
	setAccessibilityFunctions();

	var voicesLoaderFunction = function (voices) {
		var selectVoices = document.querySelector("#voice");
		selectVoices.innerHTML = Array.prototype.reduce.call(voices, function (acc, elm, idx) {
		return  elm.lang.indexOf("pt") !== -1 ? 
				 acc + "<option value=\"" + idx + "\">" 
					  + elm.name + " (" + elm.lang + ")" + "</option>" : acc; 
		}, "");

		setSpeakFunction(voices);
	};

	var f_yes = function () {
		$("#availability-info").hide();
		setOptions();
		$("#tts").change();
		$("#stop-hear").parent().hide();
		$("#hear").parent().show();
		
		loadVoices(voicesLoaderFunction);
		
		var recog = new webkitSpeechRecognition();
		recog.lang = "pt-BR";
		recog.continuous = true;
		recog.interimResults = false;

		recog.onresult = function (ev) {
			$("#text").val(Array.prototype.reduce.call(ev.results, function(acc, speechResult) {
				return acc + evalTranscript(speechResult[0].transcript);
			}, ""));
			$("#text").focus();
		}

		var animObject = animate($(".bticon"), 10, -10);

		recog.onspeechstart = function (ev) {
			console.log("speech start");
			animObject.start();
		}

		recog.onspeechend = function (ev) {
			console.log("speech end");
			animObject.end();
		}

		recog.onend = function () {
			$("#stop-hear").trigger("click");
		}

		recog.onerror = function (ev) {
			console.log(ev.error + ": " + ev.message);
		}

		$("#stop-hear").click(function (ev) {
			recog.stop();
			$("#stop-hear").parent().hide();
			$("#hear").parent().show();
			animObject.end();
		});

		$("#hear").click(function (ev) {
			recog.start();
			$("#stop-hear").parent().show();
			$("#hear").parent().hide();
		});
	};

	var f_no = function () {
		//$("#content").hide();
		$("#tts").change();
		$("#option-selector").hide();
		$("#availability-info").show();

		loadVoices(voicesLoaderFunction);
	}

	testAPIAvailability(f_yes, f_no);

	
});
