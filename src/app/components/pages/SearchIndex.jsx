import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import _ from 'lodash';
import { search } from 'app/redux/SearchReducer';
import Callout from 'app/components/elements/Callout';
import ElasticSearchInput from 'app/components/elements/ElasticSearchInput';
import PostsList from 'app/components/cards/PostsList';
import { fromJS } from 'immutable';

class SearchIndex extends React.Component {
    static propTypes = {
        loading: PropTypes.bool.isRequired,
        performSearch: PropTypes.func.isRequired,
        params: PropTypes.shape({
            q: PropTypes.string,
            s: PropTypes.string,
        }).isRequired,
        scrollId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]).isRequired,
        error: PropTypes.object.isRequired,
        result: PropTypes.arrayOf(
            PropTypes.shape({
                app: PropTypes.string,
                author: PropTypes.string,
                author_rep: PropTypes.number,
                body: PropTypes.string,
                body_marked: PropTypes.string,
                category: PropTypes.string,
                children: PropTypes.number,
                created_at: PropTypes.string,
                depth: PropTypes.number,
                id: PropTypes.number,
                img_url: PropTypes.string,
                payout: PropTypes.number,
                permlink: PropTypes.string,
                title: PropTypes.string,
                title_marked: PropTypes.string,
                total_votes: PropTypes.number,
                up_votes: PropTypes.number,
            })
        ).isRequired,
    };

    constructor(props) {
        super(props);
        this.fetchMoreResults = this.fetchMoreResults.bind(this);
    }

    componentDidMount() {
        const { performSearch, params } = this.props;
        if (!params.s) {
            params.s = 'newest';
        }
        if (params.q) {
            performSearch(params);
        }
    }

    componentDidUpdate(prevProps) {
        const { performSearch, params } = this.props;
        if (prevProps.params !== params) performSearch(params);
    }

    fetchMoreResults() {
        const { params, performSearch, scrollId } = this.props;
        performSearch({ ...params, scroll_id: scrollId });
    }

    render() {
        const {
 result, loading, params, performSearch, error
} = this.props;
        const errorMessage = _.get(error, 'message', undefined);

        const searchResults = (
            // eslint-disable-next-line react/no-string-refs
            <PostsList ref="list" posts={fromJS(result)} loading={loading} loadMore={this.fetchMoreResults} />
        );

        return (
            <div className="PostsIndex row layout-list">
                <article className="articles">
                    <div className="articles__header row">
                        <div className="small-12 medium-12 large-12 column">
                            <ElasticSearchInput
                                initValue={params.q}
                                expanded
                                handleSubmit={(q, s) => {
                                    performSearch({ q, s });
                                }}
                                redirect
                                loading={loading}
                            />
                        </div>
                    </div>
                    {!loading && !errorMessage && result.length === 0 ? (
                        <Callout>Nothing was found.</Callout>
                    ) : (
                        searchResults
                    )}
                    {!loading
                        && errorMessage && (
                            <Callout title="There was an error" type="alert">
                                {errorMessage}
                            </Callout>
                        )}
                </article>
            </div>
        );
    }
}

module.exports = {
    path: 'search',
    component: connect(
        (state, ownProps) => {
            const params = ownProps.location.query;
            return {
                loading: state.search.get('pending'),
                result: state.search.get('result').toJS() || {},
                error: state.search.get('error') || {},
                scrollId: state.search.get('scrollId'),
                isBrowser: process.env.BROWSER,
                params,
            };
        },
        (dispatch) => ({
            performSearch: (args) => dispatch(search(args)),
        })
    )(SearchIndex),
};
