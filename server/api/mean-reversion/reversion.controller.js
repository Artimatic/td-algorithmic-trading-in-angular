import * as _ from 'lodash';
import * as Boom from 'boom';
import * as  moment from 'moment';

import BaseController from '../../api/templates/base.controller';

import { ReversionService } from './../mean-reversion/reversion.service';

const errors = require('../../components/errors/baseErrors');

class ReversionController extends BaseController {

    constructor() {
        super();
    }

    getAlgoData(request, response) {
        if (_.isEmpty(request.body)) {
            return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
        }
        else {
            ReversionService.getData(request.body.ticker, request.body.end)
                .then((data) => BaseController.requestGetSuccessHandler(response, data))
                .catch((err) => BaseController.requestErrorHandler(response, err));
        }
    }

    runBacktest(request, response) {
        if (_.isEmpty(request.body) ||
            !request.body.short ||
            !request.body.long) {
            return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
        }
        else {
            ReversionService.runBacktest(request.body.ticker,
                request.body.end,
                request.body.start,
                parseFloat(request.body.deviation),
                request.body.short,
                request.body.long)
                .then((data) => BaseController.requestGetSuccessHandler(response, data))
                .catch((err) => BaseController.requestErrorHandler(response, err));
        }
    }

    runBacktestQuick(request, response) {
        if (_.isEmpty(request.body) ||
            !request.body.short ||
            !request.body.long) {
            return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
        }
        else {
            ReversionService.runBacktestSnapshot(request.body.ticker,
                request.body.end,
                request.body.start,
                parseFloat(request.body.deviation),
                request.body.short,
                request.body.long)
                .then((data) => BaseController.requestGetSuccessHandler(response, data))
                .catch((err) => BaseController.requestErrorHandler(response, err));
        }
    }

    getPrice(request, response) {
        if (_.isEmpty(request.body)) {
            return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
        }
        else {
            ReversionService.getPrice(request.body.ticker, request.body.end, parseFloat(request.body.deviation))
                .then((data) => BaseController.requestGetSuccessHandler(response, data))
                .catch((err) => BaseController.requestErrorHandler(response, err));
        }
    }
}

module.exports = new ReversionController();
