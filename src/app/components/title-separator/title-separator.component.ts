import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';
import { Config } from 'src/app/config';
import { MainApi } from 'src/app/global';

/**
 * Heading and subheading can be passed through simple string inputs or
 * with transclusion when more complex content is needed.
 */
@Component({
  selector: 'app-title-separator',
  templateUrl: './title-separator.component.html',
  styleUrls: ['./title-separator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TitleSeparatorComponent implements OnInit {
  @Input()
  public heading: string;
  @Input()
  public subheading: string;
  @Input()
  public isFirst = false;
  @Input()
  public docLink: string;
  @Input()
  public icon: string;
  @Input()
  public iconClasses: string;
  @Input()
  public iconClickable: boolean;
  @Input()
  public iconTooltip: string;
  @Output()
  public iconClicked = new EventEmitter<void>();

  constructor() {}

  ngOnInit() {}

  public linkClick() {
    MainApi.send('APP_OPEN_EXTERNAL_LINK', Config.docs[this.docLink]);
  }

  public iconClick() {
    if (this.iconClickable) {
      this.iconClicked.emit();
    }
  }
}
