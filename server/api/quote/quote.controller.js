const _ = require('lodash');
const Boom = require('boom');

const BaseController = require('../../api/templates/base.controller');
const QuoteService = require('./quote.service');

const errors = require('../../components/errors/baseErrors');

const Schema = require('./quote.model');

class QuoteController extends BaseController {

    constructor() {
        super();
    }

    getQuote(request, response) {
        if (_.isEmpty(request.body)) {
            return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
        }
        else {
            QuoteService.getData(request.body.ticker, request.body.start,  request.body.end)
                .then((data) => BaseController.requestGetSuccessHandler(response, data))
                .catch((err) => BaseController.requestErrorHandler(response, err));
        }
    }
}

module.exports = new QuoteController();
