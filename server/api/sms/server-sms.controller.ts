import BaseController from '../templates/base.controller';
import ServerSmsService from './server-sms.service';
import * as _ from 'lodash';

class ServerSmsController extends BaseController {

  constructor() {
    super();
  }

  smsBuy(request, response) {
    if (_.isNil(request.body.phone) ||
      _.isNil(request.body.stock)) {

      response.status(400).send();
    } else {
      ServerSmsService.sendBuySms(request.body.phone, request.body.stock, request.body.price, request.body.quantity);
      response.status(200).send({});
    }
  }

  smsSell(request, response) {
    if (_.isNil(request.body.phone) ||
      _.isNil(request.body.stock)) {
      response.status(400).send();
    } else {
      ServerSmsService.sendSellSms(request.body.phone, request.body.stock, request.body.price, request.body.quantity);
      response.status(200).send({});
    }
  }
}

export default new ServerSmsController();
