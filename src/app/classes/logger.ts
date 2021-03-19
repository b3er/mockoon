import { Messages } from 'src/app/constants/messages.constants';
import { MainApi } from 'src/app/global';
import {
  MessageCodes,
  MessageLevels,
  MessageParams
} from 'src/app/models/messages.model';
import { ToastsService } from 'src/app/services/toasts.service';

/**
 * Logger class that can be used as is or extended
 */
export class Logger {
  constructor(
    private loggerPrefix: string,
    protected toastService?: ToastsService
  ) {}

  /**
   * Log a message and display a toast
   *
   * @param level
   * @param messageCode
   * @param messageParams
   */
  public logMessage(
    level: MessageLevels,
    messageCode: MessageCodes,
    messageParams: MessageParams = { error: { message: '', name: '' } }
  ) {
    const message = Messages[messageCode](messageParams);

    this[level](`${message.loggerMessage || message.message}`);

    if (this.toastService && message.showToast) {
      this.toastService.addToast(message.toastType, message.message);
    }
  }

  /**
   * Log an info level message
   *
   * @deprecated
   * @param message
   */
  public info(message: string) {
    MainApi.send('APP_LOGS', {
      type: 'info',
      message: this.buildMessage(message)
    });
  }

  /**
   * Log an error level message
   *
   * @deprecated
   * @param message
   */
  public error(message: string) {
    MainApi.send('APP_LOGS', {
      type: 'error',
      message: this.buildMessage(message)
    });
  }

  private buildMessage(message: string) {
    return `${this.loggerPrefix}${message}`;
  }
}
