#include "token_utils.h"

#include <cstddef>

namespace security
{

bool tokens_equal(const std::string &lhs, const std::string &rhs)
{
    if (lhs.size() != rhs.size())
    {
        return false;
    }

    unsigned char result = 0;
    for (std::size_t i = 0; i < lhs.size(); ++i)
    {
        result |= static_cast<unsigned char>(lhs[i] ^ rhs[i]);
    }

    return result == 0;
}

} // namespace security

