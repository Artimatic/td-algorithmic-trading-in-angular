import BaseController from '../templates/base.controller';
import optionsService from './options.service';

class OptionsController extends BaseController {

    constructor() {
      super();
    }

    getImpliedMove(request, response) {
        return optionsService.calculateImpliedMove(request.query.accountId,
            request.query.symbol.toUpperCase(),
            request.query.strikeCount,
            request.query.optionType,
            request.query.minExpiration,
            response)
            .then(optionsData => {
                response.status(200).send(optionsData);
            })
            .catch((err) => BaseController.requestErrorHandler(response, err));
    }
}

export default new OptionsController();
