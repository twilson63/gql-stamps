import axios from "axios";
import { uniq } from 'ramda'

const owner = "zpqhX9CmXzqTlDaG8cY3qLyGdFGpAqZp8sSrjV9OWkE"
const stampsGraph = async (after) => {
  let query = "";
  if (after) {
    query = `query {
            transactions(
             
                tags: [
                  { name: "Sequencer-Owner", values:"${owner}"},
                      { name: "App-Name", values: "SmartWeaveAction"},
                      { name: "Contract", values: "aSMILD7cEJr93i7TAVzzMjtci_sGkXcWnqpDkG6UGcA"}
                      ],
                first: 100,
                after: "${after}"
            ) {
                edges {
                    node {
                        id
                        owner { address }
                        tags { name value }
                        block { timestamp height }
                    },
                cursor
                }
            }
        }`;
  } else {
    query = `query {
            transactions(
                tags: [
                      { name: "Sequencer-Owner", values:"${owner}"},
                      { name: "App-Name", values: "SmartWeaveAction"},
                      { name: "Contract", values: "aSMILD7cEJr93i7TAVzzMjtci_sGkXcWnqpDkG6UGcA"}
                      ],
                first: 100
            ) {
                edges {
                    node {
                        id
                        owner { address }
                        tags { name value }
                        block { timestamp height }
                    },
                cursor
                }
            }
        }`;
  }

  const url = "https://arweave.net/graphql";
  const response = await axios.post(
    url,
    { query },
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );
  return await response.data;
};

export async function makeQueries() {
  try {
    const firstFetch = await stampsGraph();
    const firstEdges = firstFetch?.data?.transactions?.edges || [];
    const results = [...firstEdges];
    const finalRes = [];

    if (results.length === 100) {
      const getEdgesLength = () => results.length;

      while (true) {
        const lastCursor = results[getEdgesLength() - 1]?.cursor;

        if (lastCursor) {
          const nextFetch = await stampsGraph(lastCursor);
          const currentEdges = nextFetch?.data?.transactions?.edges || [];
          const currentEdgeLength = currentEdges.length || 0;

          if (currentEdgeLength === 0) {
            break;
          }

          results.push(...currentEdges);
        }
      }
    }

    const res = results.map((node) => node.node)
      .filter(n => JSON.parse(n.tags.find(t => t.name === 'Input').value).function === 'stamp')
      ;
    const filteredRes = uniq(res)

    for (const element of filteredRes) {
      finalRes.push({
        id: element.id,
        owner: element.owner.address,
        // pending transactions do not have block value
        timestamp: element.block ? element.block.timestamp : Date.now(),
        blockheight: element.block ? element.block.height : Date.now(),
        tags: element.tags ? element.tags : [],
      });
    }
    console.log('count', finalRes.length)
    return finalRes;
  } catch (error) {
    console.log(error);
  }
}

makeQueries()
// .then(res => console.log(JSON.stringify(res)))