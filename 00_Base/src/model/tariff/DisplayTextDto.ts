import {Expose} from "class-transformer";
import {Displaytext, Language, ShortText} from "@citrineos/base";

export class DisplayTextDto {

    @Expose({name: 'language'})
    language!: Language;

    @Expose({name: 'text'})
    text!: ShortText;

    public constructor(language: Language, text: ShortText) {
        this.language = language;
        this.text = text;
    }

    public static from(displayText: Displaytext): DisplayTextDto {
        return new DisplayTextDto(displayText.language, displayText.text);
    }

}
