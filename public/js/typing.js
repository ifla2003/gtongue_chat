var transliterable_languages = [  
   
    'ENGLISH',  
   
    'AMHARIC',  
   
    'ARABIC',  
   
    'BENGALI',  
   
    'CHINESE',  
   
    'GREEK',  
   
    'GUJARATI',  
   
    'HINDI',  
   
    'KANNADA',  
   
    'MALAYALAM',  
   
    'MARATHI',  
   
    'NEPALI',  
   
    'ORIYA',  
   
    'PERSIAN',  
   
    'PUNJABI',  
   
    'RUSSIAN',  
   
    'SANSKRIT',  
   
    'SINHALESE',  
   
    'SERBIAN',  
   
    'TAMIL',  
   
    'TELUGU',  
   
    'TIGRINYA',  
   
    'URDU'  
   
];  

var LanguageCode = {
 
    ENGLISH: 'en',
 
    AMHARIC: 'am',
 
    ARABIC: 'ar',
 
    BENGALI: 'bn',
 
    CHINESE: 'zh',
 
    GREEK: 'el',
 
    GUJARATI: 'gu',
 
    HINDI: 'hi',
 
    KANNADA: 'kn',
 
    MALAYALAM: 'ml',
 
    MARATHI: 'mr',
 
    NEPALI: 'ne',
 
    ORIYA: 'or',
 
    PERSIAN: 'fa',
 
    PUNJABI: 'pa',
 
    RUSSIAN: 'ru',
 
    SANSKRIT: 'sa',
 
    SINHALESE: 'si',
 
    SERBIAN: 'sr',
 
    TAMIL: 'ta',
 
    TELUGU: 'te',
 
    TIGRINYA: 'ti',
 
    URDU: 'ur'
 
};
 
var rtl_languages = [
 
    'Arabic',
 
    'Hebrew',
 
    'Aramaic',
 
    'Dhivehi', //also 'Maldivian'
 
    'Sorani',
 
    'Persian',// Also Farsi 
 
    'Urdu',
 
    'Sindhi',
 
    'Pashto',
 
    'Yiddish'
 
];
 
// for (var i=0;i<transliterable_languages.length;i++){
//     $('<option/>').val(transliterable_languages[i]).html(transliterable_languages[i]).appendTo('#selected_lan');
// }
 
// Load the Google Transliterate API
google.load("elements", "1", { 
    packages: "transliteration" 
});

// var selected_lan_code = LanguageCode.ENGLISH;
var selected_lan_control;

$(document).ready(() => {
    $('#selected_lan').change((event) =>{
        var selected_lan = $('#selected_lan option:selected').attr('script').toUpperCase();
        var text_element = $('#Textarea'); // Define text_element here
        var lan_control = selected_lan_control;

        try {
            if (transliterable_languages.includes(selected_lan) && selected_lan != "ENGLISH") {
                    lan_control.setLanguagePair(
                    google.elements.transliteration.LanguageCode.ENGLISH,
                    google.elements.transliteration.LanguageCode[selected_lan]);
                    lan_control.enableTransliteration();
            }
            else {
                    lan_control.setLanguagePair(
                    google.elements.transliteration.LanguageCode.ENGLISH,
                    google.elements.transliteration.LanguageCode.HINDI);
                    lan_control.disableTransliteration();
            }
        }
        catch (ex) { 
            console.error(ex);
        }
        
        if (rtl_languages.includes(selected_lan)) {
            text_element.attr('dir', 'rtl');
        }
        else {
            text_element.attr('dir', 'ltr');
        }
    });
    google.setOnLoadCallback(load_selected_lan);
    alignTextarea();
});
 
function load_selected_lan() {
    
      // Function to initialize language control
    //   lan_control = new google.elements.transliteration.TransliterationControl({
    //     sourceLanguage: google.elements.transliteration.LanguageCode.ENGLISH,
    //     destinationLanguage: [google.elements.transliteration.LanguageCode.HINDI],
    //     transliterationEnabled: true
    // });
    var selected_lan_options;
    if (transliterable_languages.includes(selected_lan)) {
        selected_lan_options = {
            sourceLanguage: google.elements.transliteration.LanguageCode.ENGLISH,
            destinationLanguage: google.elements.transliteration.LanguageCode[selected_lan],
            shortcutKey: 'ctrl+g',
            transliterationEnabled: true
        };
    }
    else {
        selected_lan_options = {
            sourceLanguage: google.elements.transliteration.LanguageCode.ENGLISH,
            destinationLanguage: ['hi'],
            shortcutKey: 'ctrl+g',
            transliterationEnabled: false
        };
 
    }
 
    selected_lan_control = new google.elements.transliteration.TransliterationControl(selected_lan_options);
    selected_lan_control.makeTransliteratable(['Textarea']);
 
}

// google.setOnLoadCallback(load_selected_lan);

// $(function () {
//     startSelectMe($('#selected_lan'));
// });
 
// //aligning the languages according to their script direction
// $(document).ready(function () {
//     alignTextarea();
// });
 
 
 
 
function startSelectMe(element_node) {
 
    element_node.selectMe({
        cssFile: './css/jquery.selectMe.css',
        width: '100%',
        columnCount: 3,
        onOptionValueChanged: function (element) {
            var selected_lan = element_node.find(":selected").val();
            var lan_control = selected_lan_control;
            var text_element = $('#Textarea');
            try {
                if (transliterable_languages.includes(selected_lan) && selected_lan != "ENGLISH") {
                    lan_control.setLanguagePair(
                        google.elements.transliteration.LanguageCode.ENGLISH,
                        google.elements.transliteration.LanguageCode[selected_lan]);
                    lan_control.enableTransliteration();
                }
                else {
                    lan_control.setLanguagePair(
                        google.elements.transliteration.LanguageCode.ENGLISH,
                        google.elements.transliteration.LanguageCode.HINDI);
                    lan_control.disableTransliteration();
                }
            }
            catch (ex) { }
            
            if (rtl_languages.includes(selected_lan)) {
                text_element.attr('dir', 'rtl');
            }
            else {
                text_element.attr('dir', 'ltr');
            }
 
        }
 
    });
 
}
 
function alignTextarea() {
    var selected_lan = $('#selected_lan option:selected').attr('script');
 
    if (rtl_languages.includes(selected_lan)) {
        $('#Textarea').attr('dir', 'rtl');
    } else {
        $('#Textarea').attr('dir', 'ltr');
    }
}