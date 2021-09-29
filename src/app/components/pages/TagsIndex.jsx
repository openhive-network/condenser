import React from 'react';
import { api } from '@hiveio/hive-js';
import { fromJS } from 'immutable';
import { Link } from 'react-router';
import { numberWithCommas } from 'app/utils/StateFunctions';
import tt from 'counterpart';

export default class TagsIndex extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            order: props.order || 'name',
            tags: [],
        };
        this.onChangeSort = this.onChangeSort.bind(this);
    }

    shouldComponentUpdate(nextProps, nextState) {
        const res = this.state !== nextState;

        return res;
    }

    async componentDidMount() {
        try {
            const res = await api.callAsync('condenser_api.get_trending_tags', []);
            this.setState({ tags: fromJS(res) });
        } catch (e) {
            console.error('Error fetching trending tags', e.message);
        }
    }

    onChangeSort = (e, order) => {
        e.preventDefault();
        this.setState({ order });
    };

    compareTags = (a, b, type) => {
        let response;
        switch (type) {
            case 'name':
                response = a.get('name').localeCompare(b.get('name'));
                break;
            case 'posts':
                response = parseInt(a.get('top_posts')) <= parseInt(b.get('top_posts')) ? 1 : -1;
                break;
            case 'comments':
                response = parseInt(a.get('comments')) <= parseInt(b.get('comments')) ? 1 : -1;
                break;
            case 'payouts':
                response = parseInt(a.get('total_payouts')) <= parseInt(b.get('total_payouts')) ? 1 : -1;
                break;
            default:
                // Nothing
        }

        return response;
    };

    render() {
        const { order, tags } = this.state;

        if (!tags || tags.length === 0) {
            return null;
        }

        const rows = tags
            .filter(
                // there is a blank tag present, as well as some starting with #. filter them out.
                (tag) => /^[a-z]/.test(tag.get('name'))
            )
            .sort((a, b) => {
                return this.compareTags(a, b, order);
            })
            .map((tag) => {
                const name = tag.get('name');
                const link = `/trending/${name}`;
                return (
                    <tr key={name}>
                        <td>
                            <Link to={link} activeClassName="active">
                                {name}
                            </Link>
                        </td>
                        <td>{numberWithCommas(tag.get('top_posts').toString())}</td>
                        <td>{numberWithCommas(tag.get('comments').toString())}</td>
                        <td>{numberWithCommas(tag.get('total_payouts'))}</td>
                    </tr>
                );
            })
            .toArray();

        const cols = [
            ['name', tt('g.tag')],
            ['posts', tt('g.posts')],
            ['comments', tt('g.comments')],
            ['payouts', tt('g.payouts')],
        ].map((col) => {
            return (
                <th key={col[0]}>
                    {order === col[0] ? (
                        <strong>{col[1]}</strong>
                    ) : (
                        <Link to="#" onClick={(e) => this.onChangeSort(e, col[0])}>
                            {col[1]}
                        </Link>
                    )}
                </th>
            );
        });

        return (
            <div className="TagsIndex row">
                <div className="column">
                    <br />
                    <h4>{tt('g.trending_topics')}</h4>
                    <table>
                        <thead>
                            <tr>{cols}</tr>
                        </thead>
                        <tbody>{rows}</tbody>
                    </table>
                </div>
            </div>
        );
    }
}

module.exports = {
    path: 'tags(/:order)',
    component: TagsIndex,
};
