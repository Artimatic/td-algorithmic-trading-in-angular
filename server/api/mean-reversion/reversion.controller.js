const _ = require('lodash');
const Boom = require('boom');

const BaseController = require('../../api/templates/base.controller');
const ReversionService = require('./reversion.service');

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
        if (_.isEmpty(request.body)) {
            return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
        }
        else {
            ReversionService.runBacktest(request.body.ticker, request.body.end, request.body.start, request.body.deviation)
                .then((data) => BaseController.requestGetSuccessHandler(response, data))
                .catch((err) => BaseController.requestErrorHandler(response, err));
        }
    }

    runBacktestQuick(request, response) {
        if (_.isEmpty(request.body)) {
            return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
        }
        else {
            ReversionService.runBacktestSnapshot(request.body.ticker, request.body.end, request.body.start, request.body.deviation)
                .then((data) => BaseController.requestGetSuccessHandler(response, data))
                .catch((err) => BaseController.requestErrorHandler(response, err));
        }
    }
    getPrice(request, response) {
        if (_.isEmpty(request.body)) {
            return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
        }
        else {
            ReversionService.getPrice(request.body.ticker, request.body.end, request.body.deviation)
                .then((data) => BaseController.requestGetSuccessHandler(response, data))
                .catch((err) => BaseController.requestErrorHandler(response, err));
        }
    }
}

module.exports = new ReversionController();
